import com.sun.net.httpserver.*;
import javax.net.ssl.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.security.cert.X509Certificate;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Predicate;
import java.util.zip.*;

/** Self-contained Java 17 classroom HTTPS server. No external runtime dependencies. */
public class ClassroomServer {
    static final String COOKIE="__Host-classroom";
    static final SecureRandom RANDOM=new SecureRandom();
    static final Set<String> ADMIN_OPS=Set.of("live_admin_list_users","live_admin_set_suspension","live_admin_room_members","live_admin_kick","live_admin_delete_room");
    static Path base=Path.of("").toAbsolutePath();
    static class UserError extends RuntimeException { UserError(String s){super(s);} }
    static Map<String,Object> obj(Object... kv){Map<String,Object> m=new LinkedHashMap<>();for(int i=0;i<kv.length;i+=2)m.put((String)kv[i],kv[i+1]);return m;}
    @SuppressWarnings("unchecked") static Map<String,Object> map(Object o){if(!(o instanceof Map))throw new UserError("입력 형식을 확인하세요.");return (Map<String,Object>)o;}
    @SuppressWarnings("unchecked") static List<Map<String,Object>> rows(Object o){return (List<Map<String,Object>>)o;}
    static String str(Object o){return o instanceof String?(String)o:"";}
    static long num(Object o){if(o==null)return 0;if(!(o instanceof Number))throw new UserError("숫자 입력을 확인하세요.");return ((Number)o).longValue();}
    static boolean yes(Object o){return Boolean.TRUE.equals(o);}
    static long now(){return System.currentTimeMillis();}
    static String iso(Object t){return t==null?null:Instant.ofEpochMilli(num(t)).toString();}
    static String uid(){return UUID.randomUUID().toString();}
    static String random(int count){byte[] b=new byte[count];RANDOM.nextBytes(b);return HexFormat.of().formatHex(b);}
    static String text(Object value,int min,int max,String label,boolean trim){if(!(value instanceof String))throw new UserError(label+"을 확인하세요.");String s=(String)value;if(trim)s=s.strip();if(s.length()<min||s.length()>max||s.indexOf('\0')>=0)throw new UserError(label+": "+min+"~"+max+"자로 입력하세요.");return s;}
    static String login(Object v){String s=str(v).strip().toLowerCase(Locale.ROOT);if(!s.matches("[a-z0-9][a-z0-9_.@+\\-]{2,79}"))throw new UserError("아이디는 영문·숫자·_.@+-로 3~80자 입력하세요.");return s;}
    static String client(Object o){try{return UUID.fromString(str(o)).toString();}catch(Exception e){throw new UserError("접속 ID를 확인하세요. 새로고침 후 다시 입장하세요.");}}
    static String nickname(Object o){String s=text(o,1,24,"닉네임",true);if(s.chars().anyMatch(c->c<32||c==127))throw new UserError("닉네임에 제어 문자를 넣을 수 없습니다.");return s;}
    static String key(String title){return title.strip().toLowerCase(Locale.ROOT);}
    static String hash(String password){try{byte[] salt=new byte[16];RANDOM.nextBytes(salt);return "pbkdf2$600000$"+HexFormat.of().formatHex(salt)+"$"+HexFormat.of().formatHex(derive(password,salt,600000));}catch(Exception e){throw new IllegalStateException(e);}}
    static byte[] derive(String password,byte[] salt,int iterations)throws Exception{PBEKeySpec p=new PBEKeySpec(password.toCharArray(),salt,iterations,256);try{return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(p).getEncoded();}finally{p.clearPassword();}}
    static boolean matches(String password,String encoded){try{String[] p=encoded.split("\\$");return MessageDigest.isEqual(derive(password,HexFormat.of().parseHex(p[2]),Integer.parseInt(p[1])),HexFormat.of().parseHex(p[3]));}catch(Exception e){return false;}}
    static String digest(String s){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    static void privateFile(Path p){try{Files.setPosixFilePermissions(p,PosixFilePermissions.fromString("rw-------"));}catch(UnsupportedOperationException|IOException ignored){}}
    static void atomic(Path path,byte[] bytes)throws IOException{Files.createDirectories(path.getParent());Path tmp=Files.createTempFile(path.getParent(),".write-",".tmp");try{privateFile(tmp);try(FileChannel c=FileChannel.open(tmp,StandardOpenOption.WRITE)){ByteBuffer b=ByteBuffer.wrap(bytes);while(b.hasRemaining())c.write(b);c.force(true);}try{Files.move(tmp,path,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}catch(AtomicMoveNotSupportedException e){Files.move(tmp,path,StandardCopyOption.REPLACE_EXISTING);}privateFile(path);}finally{Files.deleteIfExists(tmp);}}
    static void writeJson(Path p,Object v)throws IOException{atomic(p,Json.encode(v).getBytes(StandardCharsets.UTF_8));}
    static Object readJson(Path p)throws IOException{return Json.parse(Files.readString(p,StandardCharsets.UTF_8));}

    static class Store {
        final Path file;Map<String,Object> data;
        final Map<String,Map<String,Object>> sessions=new HashMap<>();
        final Map<String,Map<String,Object>> members=new LinkedHashMap<>();
        final Map<String,Map<String,Object>> shares=new HashMap<>();
        final List<Map<String,Object>> signals=new ArrayList<>();long signalId=0;
        Store(Path dir)throws IOException{Files.createDirectories(dir);file=dir.resolve("classroom-data.json");if(Files.exists(file)){try{data=map(readJson(file));if(num(data.get("version"))!=1)throw new IOException("지원하지 않는 데이터 버전입니다.");for(String n:List.of("users","rooms","messages","audit"))if(!(data.get(n) instanceof List))throw new IOException("데이터 형식 오류");map(data.get("limits"));}catch(RuntimeException e){throw new IOException("데이터 파일이 손상되었습니다. data를 지우지 말고 백업을 확인하세요.",e);}}else data=obj("version",1,"users",new ArrayList<>(),"rooms",new ArrayList<>(),"messages",new ArrayList<>(),"audit",new ArrayList<>(),"limits",new LinkedHashMap<>(),"messageId",0);}
        List<Map<String,Object>> list(String name){return rows(data.get(name));}
        Map<String,Object> find(String list,String field,Object value){return this.list(list).stream().filter(r->Objects.equals(r.get(field),value)).findFirst().orElse(null);}
        void save()throws IOException{writeJson(file,data);}
        void audit(String actor,String action,String target,String room){List<Map<String,Object>> a=list("audit");a.add(obj("actor",actor,"action",action,"target_user",target,"target_room",room,"created",now()));if(a.size()>5000)a.subList(0,a.size()-5000).clear();}
        synchronized void admin(String login,String password)throws IOException{login=ClassroomServer.login(login);password=text(password,12,128,"관리자 비밀번호",false);if(list("users").stream().anyMatch(u->yes(u.get("admin"))))throw new UserError("관리자가 이미 있습니다. 기존 관리자 계정으로 로그인하세요.");if(find("users","login",login)!=null)throw new UserError("이미 사용 중인 아이디입니다.");list("users").add(obj("id",uid(),"login",login,"nickname","관리자","password",hash(password),"admin",true,"suspended",false,"created",now(),"last_login",null));save();}
        synchronized void reset(String login,String password)throws IOException{Map<String,Object> u=find("users","login",ClassroomServer.login(login));if(u==null)throw new UserError("회원을 찾을 수 없습니다.");u.put("password",hash(text(password,8,128,"새 비밀번호",false)));sessions.values().removeIf(s->Objects.equals(s.get("user"),u.get("id")));removeMembers(m->Objects.equals(m.get("user_id"),u.get("id")));save();}
        Map<String,Object> publicUser(Map<String,Object> u){return obj("id",u.get("id"),"email",u.get("login"),"user_metadata",obj("display_name",u.get("nickname")));}
        Map<String,Object> user(String token){Map<String,Object> s=sessions.get(digest(token));Map<String,Object> u=s==null||num(s.get("expires"))<=now()?null:find("users","id",s.get("user"));if(u==null)throw new UserError("로그인이 필요합니다. 다시 로그인하세요.");if(yes(u.get("suspended")))throw new UserError("이용 정지된 계정입니다. 관리자에게 문의하세요.");return u;}
        boolean limited(String k,int count,long window){Map<String,Object> limits=map(data.get("limits"));long t=now();limits.entrySet().removeIf(e->num(map(e.getValue()).get("at"))<t-86400000);Map<String,Object> row=limits.containsKey(k)?map(limits.get(k)):null;if(row!=null&&num(row.get("at"))>t-window){if(num(row.get("n"))>=count)return true;row.put("n",num(row.get("n"))+1);}else limits.put(k,obj("n",1,"at",t));return false;}
        record Auth(Map<String,Object> data,String cookie){}
        synchronized Auth auth(String action,Map<String,Object> a,String token,String ip,boolean signup)throws IOException{
            sessions.values().removeIf(s->num(s.get("expires"))<now());
            if(action.equals("logout")){sessions.remove(digest(token));return new Auth(obj(),"");}
            if(action.equals("session")){try{return new Auth(obj("session",obj("user",publicUser(user(token)))),null);}catch(UserError e){return new Auth(obj("session",null),"");}}
            if(!Set.of("login","signup").contains(action))throw new UserError("지원하지 않는 요청입니다.");
            String raw=str(a.get("login")).strip().toLowerCase(Locale.ROOT);if(raw.length()>100)raw=raw.substring(0,100);
            if(limited(action+":ip:"+ip,action.equals("signup")?5:60,300000)){save();return new Auth(obj("error","시도가 너무 많습니다. 5분 후 다시 시도하세요."),null);}
            String limitKey="login:"+ip+":"+raw;
            if(action.equals("login")&&limited(limitKey,8,300000)){save();return new Auth(obj("error","로그인 시도가 너무 많습니다. 5분 후 다시 시도하세요."),null);}
            try{
                String id=login(raw),pw=text(a.get("password"),8,128,"비밀번호",false);
                Map<String,Object> u=find("users","login",id);
                if(action.equals("signup")){
                    if(!signup)throw new UserError("현재 회원가입이 닫혀 있습니다. 관리자에게 문의하세요.");
                    if(u!=null)throw new UserError("이미 사용 중인 아이디입니다.");
                    if(list("users").size()>=500)throw new UserError("회원 한도입니다. 관리자에게 문의하세요.");
                    u=obj("id",uid(),"login",id,"nickname",nickname(a.get("nickname")),"password",hash(pw),"admin",false,"suspended",false,"created",now(),"last_login",null);list("users").add(u);
                }else if(!matches(pw,u==null?"pbkdf2$600000$"+"00".repeat(16)+"$"+"00".repeat(32):str(u.get("password"))))throw new UserError("아이디 또는 비밀번호가 올바르지 않습니다.");
                if(yes(u.get("suspended")))throw new UserError("이용 정지된 계정입니다. 관리자에게 문의하세요.");
                map(data.get("limits")).remove(limitKey);u.put("last_login",now());save();
                String idValue=str(u.get("id"));List<String> old=sessions.entrySet().stream().filter(e->Objects.equals(e.getValue().get("user"),idValue)).sorted(Comparator.comparingLong(e->num(e.getValue().get("expires")))).map(Map.Entry::getKey).toList();for(int i=0;i<old.size()-9;i++)sessions.remove(old.get(i));
                String newToken=random(32);sessions.put(digest(newToken),obj("user",idValue,"expires",now()+7*86400000L));Map<String,Object> pu=publicUser(u);return new Auth(obj("user",pu,"session",obj("user",pu)),newToken);
            }catch(UserError e){save();return new Auth(obj("error",e.getMessage()),null);}
        }
        void requireAdmin(Map<String,Object> u){if(!yes(u.get("admin")))throw new UserError("관리자만 사용할 수 있습니다.");}
        String memberKey(String room,String client){return room+":"+client;}
        Map<String,Object> requireMember(Map<String,Object> u,String room,String client){if(find("rooms","id",room)==null)throw new UserError("이미 삭제된 방입니다.");Map<String,Object> m=members.get(memberKey(room,client));if(m==null||!Objects.equals(m.get("user_id"),u.get("id"))||num(m.get("seen"))<now()-90000)throw new UserError("방 접속이 만료되었습니다. 비밀번호를 입력해 다시 입장하세요.");return m;}
        void removeMembers(Predicate<Map<String,Object>> filter){List<Map<String,Object>> gone=members.values().stream().filter(filter).toList();for(Map<String,Object> m:gone){String rid=str(m.get("room_id")),cid=str(m.get("client_id"));Map<String,Object> s=shares.get(rid);if(s!=null&&Objects.equals(s.get("client"),cid))shares.remove(rid);signals.removeIf(g->Objects.equals(g.get("room_id"),rid)&&(Objects.equals(g.get("sender"),cid)||Objects.equals(g.get("recipient"),cid)));members.remove(memberKey(rid,cid));}}
        void deleteRoom(String rid){list("rooms").removeIf(r->Objects.equals(r.get("id"),rid));list("messages").removeIf(r->Objects.equals(r.get("room_id"),rid));removeMembers(m->Objects.equals(m.get("room_id"),rid));shares.remove(rid);signals.removeIf(s->Objects.equals(s.get("room_id"),rid));}
        Map<String,Object> message(Map<String,Object> m){return obj("id",m.get("id"),"display_name",m.get("display_name"),"body",m.get("body"),"is_code",m.get("is_code"),"created_at",iso(m.get("created")));}
        synchronized Object rpc(String token,String name,Map<String,Object> a)throws IOException{
            Map<String,Object> u=user(token);String userId=str(u.get("id"));long t=now();
            switch(name){
                case "live_account_status":return obj("is_admin",u.get("admin"),"nickname",u.get("nickname"));
                case "live_set_nickname":{String n=nickname(a.get("p_nickname"));u.put("nickname",n);members.values().stream().filter(m->Objects.equals(m.get("user_id"),userId)).forEach(m->m.put("name",n));save();return obj("nickname",n);}
                case "live_list_rooms":{
                    int off=(int)Math.max(0,Math.min(num(a.get("p_offset")),10000));List<Map<String,Object>> all=list("rooms").stream().sorted(Comparator.comparingLong((Map<String,Object> r)->num(r.get("created"))).reversed()).toList();
                    List<Object> result=new ArrayList<>();for(Map<String,Object> r:all.subList(Math.min(off,all.size()),Math.min(off+50,all.size()))){long n=members.values().stream().filter(m->Objects.equals(m.get("room_id"),r.get("id"))&&num(m.get("seen"))>t-45000).count();result.add(obj("id",r.get("id"),"code",r.get("code"),"title",r.get("title"),"created_at",iso(r.get("created")),"is_owner",Objects.equals(r.get("owner_id"),userId),"member_count",n));}return obj("rooms",result,"total",all.size(),"offset",off,"has_more",off+50<all.size());
                }
                case "live_create_room":{
                    String title=text(a.get("p_title"),1,60,"방 이름",true),pw=text(a.get("p_password"),6,64,"방 비밀번호",false),cid=client(a.get("p_client"));
                    if(find("rooms","title_key",key(title))!=null)throw new UserError("이미 사용 중인 방 이름입니다. 다른 이름을 입력하세요.");
                    if(list("rooms").stream().filter(r->Objects.equals(r.get("owner_id"),userId)).count()>=10)throw new UserError("계정당 최대 10개 방을 만들 수 있습니다.");
                    String rid=uid(),code=random(6).toUpperCase(Locale.ROOT);list("rooms").add(obj("id",rid,"code",code,"title",title,"title_key",key(title),"owner_id",userId,"password",hash(pw),"created",t));save();members.put(memberKey(rid,cid),obj("room_id",rid,"client_id",cid,"user_id",userId,"name",u.get("nickname"),"seen",t));return obj("room_id",rid,"code",code);
                }
                case "live_join_room":case "live_join_room_by_name":{
                    String cid=client(a.get("p_client"));if(limited("join:"+userId,8,300000)){save();return obj("error","입장 시도가 너무 많습니다. 5분 후 다시 시도하세요.");}
                    Map<String,Object> r=name.equals("live_join_room")?find("rooms","code",str(a.get("p_code")).strip().toUpperCase(Locale.ROOT)):find("rooms","title_key",key(str(a.get("p_room_name"))));
                    String pw=str(a.get("p_password"));if(r==null||pw.length()>64||!matches(pw,str(r.get("password")))){save();return obj("error","방 이름·코드 또는 방 비밀번호가 올바르지 않습니다.");}
                    String rid=str(r.get("id"));Map<String,Object> old=members.get(memberKey(rid,cid));if(old!=null&&!Objects.equals(old.get("user_id"),userId))throw new UserError("다른 접속에서 사용 중인 ID입니다. 새로고침하세요.");
                    long count=members.values().stream().filter(m->Objects.equals(m.get("room_id"),rid)&&!Objects.equals(m.get("client_id"),cid)&&num(m.get("seen"))>t-45000).count();if(count>=8)throw new UserError("방이 가득 찼습니다. 최대 8명까지 입장할 수 있습니다.");
                    map(data.get("limits")).remove("join:"+userId);save();members.put(memberKey(rid,cid),obj("room_id",rid,"client_id",cid,"user_id",userId,"name",u.get("nickname"),"seen",t));return obj("room_id",rid,"code",r.get("code"));
                }
                case "live_close_room":{
                    String rid=str(a.get("p_room"));Map<String,Object> r=find("rooms","id",rid);if(r==null||!Objects.equals(r.get("owner_id"),userId))throw new UserError("방을 만든 사람만 삭제할 수 있습니다.");deleteRoom(rid);save();return null;
                }
            }
            if(name.startsWith("live_admin_")){
                requireAdmin(u);if(!ADMIN_OPS.contains(name))throw new UserError("지원하지 않는 요청입니다.");
                String rid=str(a.get("p_room")),target=str(a.get("p_user"));
                if(name.equals("live_admin_list_users")){
                    int off=(int)Math.max(0,Math.min(num(a.get("p_offset")),10000));String term=str(a.get("p_search")).strip().toLowerCase(Locale.ROOT);if(term.length()>100)term=term.substring(0,100);final String query=term;
                    List<Map<String,Object>> all=list("users").stream().filter(p->str(p.get("login")).toLowerCase(Locale.ROOT).contains(query)||str(p.get("nickname")).toLowerCase(Locale.ROOT).contains(query)).sorted(Comparator.comparingLong((Map<String,Object> p)->num(p.get("created"))).reversed()).toList();List<Object> result=new ArrayList<>();
                    for(Map<String,Object> p:all.subList(Math.min(off,all.size()),Math.min(off+50,all.size())))result.add(obj("id",p.get("id"),"email",p.get("login"),"nickname",p.get("nickname"),"created_at",iso(p.get("created")),"last_sign_in_at",iso(p.get("last_login")),"suspended",p.get("suspended"),"is_admin",p.get("admin")));
                    return obj("users",result,"total",all.size(),"offset",off,"has_more",off+50<all.size());
                }
                if(name.equals("live_admin_room_members")){
                    Map<String,List<Map<String,Object>>> grouped=new LinkedHashMap<>();for(Map<String,Object> m:members.values())if(Objects.equals(m.get("room_id"),rid)&&num(m.get("seen"))>t-45000)grouped.computeIfAbsent(str(m.get("user_id")),k->new ArrayList<>()).add(m);List<Object> result=new ArrayList<>();for(var e:grouped.entrySet()){Map<String,Object> p=find("users","id",e.getKey());if(p!=null)result.add(obj("user_id",p.get("id"),"email",p.get("login"),"nickname",p.get("nickname"),"connections",e.getValue().size(),"is_admin",p.get("admin")));}return result;
                }
                String action;
                if(name.equals("live_admin_delete_room")){if(find("rooms","id",rid)==null)throw new UserError("이미 삭제된 방입니다.");deleteRoom(rid);action="delete-room";}
                else{Map<String,Object> p=find("users","id",target);if(p==null)throw new UserError("회원을 찾을 수 없습니다.");if(yes(p.get("admin")))throw new UserError("관리자 계정은 정지하거나 퇴장시킬 수 없습니다.");if(name.equals("live_admin_set_suspension")){if(!(a.get("p_suspended") instanceof Boolean))throw new UserError("이용 상태를 확인하세요.");boolean suspend=yes(a.get("p_suspended"));p.put("suspended",suspend);if(suspend)removeMembers(m->Objects.equals(m.get("user_id"),target));action=suspend?"suspend":"unsuspend";}else{removeMembers(m->Objects.equals(m.get("room_id"),rid)&&Objects.equals(m.get("user_id"),target));action="kick";}}
                audit(userId,action,target,rid);save();return null;
            }
            if(!Set.of("live_room_state","live_chat_history","live_share","live_send_signal","live_send_message","live_leave_room").contains(name))throw new UserError("지원하지 않는 요청입니다.");
            String rid=str(a.get("p_room")),cid=client(a.get("p_client"));Map<String,Object> member=requireMember(u,rid,cid),room=find("rooms","id",rid),share=shares.get(rid);
            switch(name){
                case "live_leave_room":removeMembers(m->Objects.equals(m.get("room_id"),rid)&&Objects.equals(m.get("client_id"),cid));return null;
                case "live_room_state":{
                    member.put("seen",t);members.values().removeIf(m->num(m.get("seen"))<t-86400000);signals.removeIf(s->num(s.get("created"))<t-600000);
                    if(share!=null){Map<String,Object> source=members.get(memberKey(rid,str(share.get("client"))));if(source==null||num(source.get("seen"))<t-45000){shares.remove(rid);share=null;}}
                    Map<String,Object> rs=obj("id",rid,"code",room.get("code"),"title",room.get("title"),"owner_id",room.get("owner_id"),"share_client",share==null?null:share.get("client"),"share_epoch",share==null?null:share.get("epoch"));
                    List<Object> ms=new ArrayList<>();for(Map<String,Object> m:members.values())if(Objects.equals(m.get("room_id"),rid)&&num(m.get("seen"))>t-45000)ms.add(obj("client_id",m.get("client_id"),"user_id",m.get("user_id"),"name",m.get("name")));
                    long after=Math.max(0,num(a.get("p_after_message"))),afterSignal=Math.max(0,num(a.get("p_after_signal")));List<Map<String,Object>> msgs=list("messages").stream().filter(m->Objects.equals(m.get("room_id"),rid)&&num(m.get("id"))>after).toList();if(after==0)msgs=msgs.subList(Math.max(0,msgs.size()-100),msgs.size());else msgs=msgs.subList(0,Math.min(100,msgs.size()));List<Object> ss=new ArrayList<>();String epoch=share==null?null:str(share.get("epoch"));for(Map<String,Object> s:signals)if(Objects.equals(s.get("room_id"),rid)&&Objects.equals(s.get("recipient"),cid)&&num(s.get("id"))>afterSignal&&Objects.equals(s.get("epoch"),epoch)&&ss.size()<200)ss.add(obj("id",s.get("id"),"sender",s.get("sender"),"epoch",s.get("epoch"),"kind",s.get("kind"),"payload",s.get("payload")));
                    return obj("room",rs,"members",ms,"messages",msgs.stream().map(this::message).toList(),"signals",ss);
                }
                case "live_chat_history":{long before=num(a.get("p_before"));List<Map<String,Object>> msgs=list("messages").stream().filter(m->Objects.equals(m.get("room_id"),rid)&&num(m.get("id"))<before).toList();return msgs.subList(Math.max(0,msgs.size()-50),msgs.size()).stream().map(this::message).toList();}
                case "live_share":{
                    if(!(a.get("p_start") instanceof Boolean))throw new UserError("공유 상태를 확인하세요.");if(yes(a.get("p_start"))){if(share!=null&&!Objects.equals(share.get("client"),cid)){Map<String,Object> source=members.get(memberKey(rid,str(share.get("client"))));if(source!=null&&num(source.get("seen"))>t-45000)throw new UserError("다른 사람이 공유 중입니다. 공유가 끝난 후 시작하세요.");}String epoch=uid();shares.put(rid,obj("client",cid,"epoch",epoch));return obj("epoch",epoch);}if(share!=null&&Objects.equals(share.get("client"),cid))shares.remove(rid);return obj("epoch",shares.containsKey(rid)?shares.get(rid).get("epoch"):null);
                }
                case "live_send_message":{
                    String body=text(a.get("p_body"),1,8000,"메시지",false);if(body.isBlank())throw new UserError("메시지를 입력하세요.");if(list("messages").stream().filter(m->Objects.equals(m.get("room_id"),rid)&&Objects.equals(m.get("user_id"),userId)&&num(m.get("created"))>t-60000).count()>=30)throw new UserError("메시지는 분당 30개까지 보낼 수 있습니다.");long id=num(data.get("messageId"))+1;data.put("messageId",id);list("messages").add(obj("id",id,"room_id",rid,"user_id",userId,"display_name",member.get("name"),"body",body,"is_code",yes(a.get("p_is_code")),"created",t));List<Map<String,Object>> ms=list("messages").stream().filter(m->Objects.equals(m.get("room_id"),rid)).toList();if(ms.size()>1000){long first=num(ms.get(ms.size()-1000).get("id"));list("messages").removeIf(m->Objects.equals(m.get("room_id"),rid)&&num(m.get("id"))<first);}save();return null;
                }
                case "live_send_signal":{
                    String target=client(a.get("p_target")),epoch=str(a.get("p_epoch")),kind=str(a.get("p_kind"));if(share==null||!Objects.equals(share.get("epoch"),epoch)||target.equals(cid))throw new UserError("종료된 화면 공유입니다.");Map<String,Object> dest=members.get(memberKey(rid,target));if(dest==null||num(dest.get("seen"))<t-45000)throw new UserError("상대방이 방을 나갔습니다.");boolean presenter=Objects.equals(share.get("client"),cid);if(!((presenter&&Set.of("offer","ice").contains(kind))||(Objects.equals(share.get("client"),target)&&Set.of("watch","answer","ice").contains(kind))))throw new UserError("허용되지 않은 신호입니다.");Map<String,Object> payload=map(a.get("p_payload"));if(Json.encode(payload).getBytes(StandardCharsets.UTF_8).length>65536)throw new UserError("신호가 너무 큽니다.");if(signals.stream().filter(s->Objects.equals(s.get("room_id"),rid)&&Objects.equals(s.get("sender"),cid)&&num(s.get("created"))>t-60000).count()>=600)throw new UserError("잠시 후 다시 연결하세요.");signals.add(obj("id",++signalId,"room_id",rid,"sender",cid,"recipient",target,"epoch",epoch,"kind",kind,"payload",payload,"created",t));return null;
                }
            }
            throw new UserError("지원하지 않는 요청입니다.");
        }
        synchronized Path backup(Path dir)throws IOException{save();Path target=dir.resolve("backup-"+java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss-SSS").format(LocalDateTime.now())+".json");atomic(target,Files.readAllBytes(file));return target;}
    }

    // Strict bounded-depth JSON codec: no Java object deserialization or third-party library.
    static class Json {
        String s;int p;Json(String s){this.s=s;}
        static Object parse(String s){Json j=new Json(s);Object v=j.value(0);j.ws();if(j.p!=s.length())throw new UserError("JSON 형식 오류");return v;}
        void ws(){while(p<s.length()&&" \r\n\t".indexOf(s.charAt(p))>=0)p++;}
        char next(){if(p>=s.length())throw new UserError("JSON 형식 오류");return s.charAt(p++);}
        Object value(int depth){if(depth>40)throw new UserError("요청이 너무 복잡합니다.");ws();char c=next();if(c=='"')return string();if(c=='{'){Map<String,Object> m=new LinkedHashMap<>();ws();if(p<s.length()&&s.charAt(p)=='}'){p++;return m;}do{ws();if(next()!='"')throw new UserError("JSON 형식 오류");String k=string();ws();if(next()!=':')throw new UserError("JSON 형식 오류");if(m.containsKey(k))throw new UserError("중복 JSON 필드");m.put(k,value(depth+1));ws();char end=next();if(end=='}')return m;if(end!=',')throw new UserError("JSON 형식 오류");}while(true);}if(c=='['){List<Object> l=new ArrayList<>();ws();if(p<s.length()&&s.charAt(p)==']'){p++;return l;}do{l.add(value(depth+1));ws();char end=next();if(end==']')return l;if(end!=',')throw new UserError("JSON 형식 오류");}while(true);}p--;for(String word:List.of("true","false","null"))if(s.startsWith(word,p)){p+=word.length();return word.equals("null")?null:word.equals("true");}int start=p;while(p<s.length()&&"-+0123456789.eE".indexOf(s.charAt(p))>=0)p++;String n=s.substring(start,p);if(!n.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?"))throw new UserError("JSON 숫자 오류");try{if(n.contains(".")||n.contains("e")||n.contains("E")){double d=Double.parseDouble(n);if(!Double.isFinite(d))throw new NumberFormatException();return d;}return Long.parseLong(n);}catch(NumberFormatException e){throw new UserError("JSON 숫자 오류");}}
        String string(){StringBuilder b=new StringBuilder();for(;;){char c=next();if(c=='"')return b.toString();if(c<' ')throw new UserError("JSON 문자열 오류");if(c=='\\'){char q=next();switch(q){case '"':case '\\':case '/':b.append(q);break;case 'b':b.append('\b');break;case 'f':b.append('\f');break;case 'n':b.append('\n');break;case 'r':b.append('\r');break;case 't':b.append('\t');break;case 'u':if(p+4>s.length())throw new UserError("JSON 문자열 오류");try{b.append((char)Integer.parseInt(s.substring(p,p+4),16));p+=4;}catch(NumberFormatException e){throw new UserError("JSON 문자열 오류");}break;default:throw new UserError("JSON 문자열 오류");}}else b.append(c);}}
        static String encode(Object o){if(o==null)return "null";if(o instanceof String){StringBuilder b=new StringBuilder("\"");for(char c:((String)o).toCharArray()){switch(c){case '"':b.append("\\\"");break;case '\\':b.append("\\\\");break;case '\n':b.append("\\n");break;case '\r':b.append("\\r");break;case '\t':b.append("\\t");break;default:if(c<32)b.append(String.format("\\u%04x",(int)c));else b.append(c);}}return b.append('"').toString();}if(o instanceof Boolean||o instanceof Number)return o.toString();if(o instanceof Map){List<String> parts=new ArrayList<>();for(var e:((Map<?,?>)o).entrySet())parts.add(encode(e.getKey().toString())+":"+encode(e.getValue()));return "{"+String.join(",",parts)+"}";}if(o instanceof Collection){List<String> parts=new ArrayList<>();for(Object x:(Collection<?>)o)parts.add(encode(x));return "["+String.join(",",parts)+"]";}throw new IllegalArgumentException("JSON type");}
    }
    static long ipv4(String s){if(!s.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}"))throw new UserError("실제 IPv4 주소를 입력하세요.");long v=0;for(String part:s.split("\\.")){int n=Integer.parseInt(part);if(n>255)throw new UserError("IPv4 주소를 확인하세요.");v=(v<<8)|n;}return v;}
    static boolean privateIP(long ip){return (ip>>>24)==10||(ip>>>20)==0xac1||(ip>>>16)==0xc0a8;}
    static class Network {
        long addr,mask;String cidr;Network(String s){String[] p=s.split("/",-1);if(p.length!=2)throw new UserError("허용 대역은 192.168.22.0/24처럼 입력하세요.");int bits;try{bits=Integer.parseInt(p[1]);}catch(NumberFormatException e){throw new UserError("대역 길이를 확인하세요.");}if(bits<1||bits>32)throw new UserError("대역 길이를 확인하세요.");mask=(0xffffffffL<<(32-bits))&0xffffffffL;addr=ipv4(p[0]);if((addr&mask)!=addr)throw new UserError("네트워크 시작 주소를 입력하세요. 예: 192.168.22.0/24");if(!privateIP(addr)||!privateIP(addr|(~mask&0xffffffffL)))throw new UserError("교실 내부 사설 대역만 허용할 수 있습니다.");cidr=s;}
        boolean has(String ip){try{return (ipv4(ip)&mask)==addr;}catch(UserError e){return false;}}
    }
    static Map<String,Object> config(Path dir)throws IOException{Map<String,Object> c=map(readJson(dir.resolve("server.json")));String ip=str(c.get("server_ip"));if(!privateIP(ipv4(ip)))throw new UserError("서버의 실제 교실 IPv4를 입력하세요.");long port=num(c.get("port"));if(port<1024||port>65535)throw new UserError("포트는 1024~65535여야 합니다.");List<?> cidrs=(List<?>)c.get("allowed_cidrs");if(cidrs==null||cidrs.isEmpty())throw new UserError("허용 대역이 필요합니다.");boolean own=false;for(Object n:cidrs)own|=new Network(str(n)).has(ip);if(!own)throw new UserError("서버 IP가 허용 대역 안에 있어야 합니다.");return c;}
    static SSLContext tls(Path dir)throws Exception{char[] pw=Files.readString(dir.resolve("tls/store-password.txt"),StandardCharsets.UTF_8).strip().toCharArray();KeyStore ks=KeyStore.getInstance("PKCS12");try(InputStream in=Files.newInputStream(dir.resolve("tls/server.p12"))){ks.load(in,pw);}KeyManagerFactory km=KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());km.init(ks,pw);SSLContext ctx=SSLContext.getInstance("TLS");ctx.init(km.getKeyManagers(),null,null);Arrays.fill(pw,'\0');return ctx;}
    static class Service implements AutoCloseable {
        HttpsServer server;ExecutorService pool;Map<String,Object> cfg;Store store;Path dir;List<Network> nets=new ArrayList<>();int port;
        Service(Map<String,Object> cfg,Store store,Path dir,int port)throws Exception{
            this.cfg=cfg;this.store=store;this.dir=dir;for(Object n:(List<?>)cfg.get("allowed_cidrs"))nets.add(new Network(str(n)));
            server=HttpsServer.create(new InetSocketAddress("0.0.0.0",port),32);this.port=server.getAddress().getPort();SSLContext ssl=tls(dir);
            server.setHttpsConfigurator(new HttpsConfigurator(ssl){public void configure(HttpsParameters p){SSLParameters params=getSSLContext().getDefaultSSLParameters();params.setProtocols(new String[]{"TLSv1.3","TLSv1.2"});p.setSSLParameters(params);}});
            pool=new ThreadPoolExecutor(8,32,60,TimeUnit.SECONDS,new ArrayBlockingQueue<>(128),new ThreadPoolExecutor.AbortPolicy());server.setExecutor(pool);server.createContext("/",this::handle);
        }
        void start(){server.start();}public void close(){server.stop(1);pool.shutdownNow();}
        boolean allowed(InetAddress ip){return ip.isLoopbackAddress()||nets.stream().anyMatch(n->n.has(ip.getHostAddress()));}
        String token(HttpExchange e){String h=e.getRequestHeaders().getFirst("Cookie");if(h!=null)for(String item:h.split(";")){String v=item.strip();if(v.startsWith(COOKIE+"="))return v.substring(COOKIE.length()+1);}return "";}
        void output(HttpExchange e,int code,byte[] body,String type,String cookie)throws IOException{Headers h=e.getResponseHeaders();h.set("Content-Type",type);h.set("Cache-Control","no-store");h.set("X-Content-Type-Options","nosniff");h.set("X-Frame-Options","DENY");h.set("Referrer-Policy","same-origin");h.set("Permissions-Policy","display-capture=(self), camera=(), microphone=()");h.set("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");if(cookie!=null)h.add("Set-Cookie",COOKIE+"="+cookie+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+(cookie.isEmpty()?0:604800));if(code>=400)h.set("Connection","close");e.sendResponseHeaders(code,body.length);try(OutputStream out=e.getResponseBody()){out.write(body);}}
        void json(HttpExchange e,int code,Object body,String cookie)throws IOException{output(e,code,Json.encode(body).getBytes(StandardCharsets.UTF_8),"application/json; charset=utf-8",cookie);}
        byte[] asset(String name)throws IOException{try(InputStream in=ClassroomServer.class.getResourceAsStream("/public/"+name)){if(in!=null)return in.readAllBytes();}Path file=base.resolve("public").resolve(name);return Files.isRegularFile(file)?Files.readAllBytes(file):null;}
        void handle(HttpExchange e){try{
            if(!allowed(e.getRemoteAddress().getAddress())){json(e,403,obj("error","교실 허용 대역에서만 접속할 수 있습니다."),null);return;}
            String host=e.getRequestHeaders().getFirst("Host");Set<String> hosts=new HashSet<>();for(String h:List.of(str(cfg.get("server_ip")),"127.0.0.1","localhost")){hosts.add(h+":"+port);if(port==443)hosts.add(h);}if(host==null||!hosts.contains(host)){json(e,403,obj("error","허용되지 않은 서버 주소입니다."),null);return;}
            String path=e.getRequestURI().getPath(),method=e.getRequestMethod();
            if(method.equals("GET")){
                if(path.equals("/api/session")){Store.Auth result=store.auth("session",obj(),token(e),e.getRemoteAddress().getAddress().getHostAddress(),yes(cfg.get("signup_enabled")));json(e,200,result.data(),result.cookie());return;}
                if(path.equals("/api/health")){json(e,200,obj("ok",true,"version","java-lan3","cloud",false),null);return;}
                String file=null,type="text/html; charset=utf-8";switch(path){case "/":case "/index.html":file="index.html";break;case "/help":file="help.html";break;case "/classroom-ca.crt":output(e,200,Files.readAllBytes(dir.resolve("tls/classroom-ca.crt")),"application/x-x509-ca-cert",null);return;default:if(Set.of("/web/app.js","/web/i18n.js","/web/config.js","/web/local-api.js","/web/style.css","/web/languages.js","/guide.js","/guide.css").contains(path)){file=path.substring(1);type=path.endsWith(".css")?"text/css; charset=utf-8":"text/javascript; charset=utf-8";}}
                byte[] bytes=file==null?null:asset(file);if(bytes==null)json(e,404,obj("error","파일을 찾을 수 없습니다."),null);else output(e,200,bytes,type,null);return;
            }
            if(!method.equals("POST")){json(e,405,obj("error","지원하지 않는 요청입니다."),null);return;}
            Headers h=e.getRequestHeaders();if(!Objects.equals(h.getFirst("Origin"),"https://"+host)||!Objects.equals(h.getFirst("X-Classroom-Request"),"1")){json(e,403,obj("error","사이트를 새로고침한 뒤 다시 시도하세요."),null);return;}
            if(h.containsKey("Transfer-Encoding")||!str(h.getFirst("Content-Type")).toLowerCase(Locale.ROOT).startsWith("application/json")){json(e,400,obj("error","JSON 요청이 필요합니다."),null);return;}
            int length;try{length=Integer.parseInt(str(h.getFirst("Content-Length")));}catch(Exception ex){length=0;}if(length<1||length>131072){json(e,413,obj("error","요청이 너무 큽니다."),null);return;}
            byte[] body=e.getRequestBody().readNBytes(length);if(body.length!=length)throw new UserError("전송이 중단되었습니다.");String content=StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).decode(ByteBuffer.wrap(body)).toString();Map<String,Object> a=map(Json.parse(content));
            if(path.equals("/api/rpc")){json(e,200,obj("data",store.rpc(token(e),str(a.get("name")),a.containsKey("args")?map(a.get("args")):obj())),null);return;}
            if(Set.of("/api/login","/api/signup","/api/logout").contains(path)){Store.Auth result=store.auth(path.substring(5),a,token(e),e.getRemoteAddress().getAddress().getHostAddress(),yes(cfg.get("signup_enabled")));json(e,result.data().containsKey("error")?400:200,result.data(),result.cookie());return;}
            json(e,404,obj("error","지원하지 않는 요청입니다."),null);
        }catch(UserError|IllegalArgumentException ex){try{json(e,400,obj("error",ex.getMessage()),null);}catch(IOException ignored){}}
        catch(IOException ex){System.err.println("[네트워크/저장 오류] "+ex.getClass().getSimpleName());try{json(e,500,obj("error","서버 연결 또는 저장 오류입니다. 서버 PC의 저장 공간과 권한을 확인하세요."),null);}catch(IOException ignored){}}
        catch(Exception ex){System.err.println("[서버 오류] "+ex.getClass().getSimpleName());try{json(e,500,obj("error","서버 오류입니다. 관리자에게 문의하세요."),null);}catch(IOException ignored){}}
        finally{e.close();}}
    }

    static Path keytool(){String executable=System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win")?"keytool.exe":"keytool";Path file=Path.of(System.getProperty("java.home"),"bin",executable);if(!Files.isRegularFile(file))throw new UserError("Java 인증서 도구 keytool을 찾지 못했습니다. JDK 폴더를 JAVA 경로로 지정하세요.");return file;}
    static void tool(Path dir,List<String> args)throws Exception{List<String> cmd=new ArrayList<>();cmd.add(keytool().toString());cmd.addAll(args);ProcessBuilder builder=new ProcessBuilder(cmd);builder.directory(dir.toFile());builder.redirectErrorStream(true);Process p=builder.start();CompletableFuture<byte[]> output=CompletableFuture.supplyAsync(()->{try{return p.getInputStream().readAllBytes();}catch(IOException e){return new byte[0];}});if(!p.waitFor(90,TimeUnit.SECONDS)){p.destroyForcibly();throw new UserError("인증서 생성 시간이 초과되었습니다.");}if(p.exitValue()!=0)throw new UserError("Java 인증서 생성에 실패했습니다. JDK 경로와 data/tls 파일 권한을 확인하세요. "+new String(output.get(),StandardCharsets.UTF_8).replaceAll("(?i)password[^\\n]*","password [hidden]"));}
    static List<String> ksArgs(String command,Path file,Path password,String alias){return new ArrayList<>(List.of(command,"-keystore",file.toString(),"-storetype","PKCS12","-storepass:file",password.toString(),"-alias",alias));}
    static void runTool(Path dir,String command,Path store,Path password,String alias,String... extra)throws Exception{List<String> args=ksArgs(command,store,password,alias);args.addAll(List.of(extra));tool(dir,args);}
    static String certificates(Path dir,String ip)throws Exception{
        Path tls=dir.resolve("tls");Files.createDirectories(tls);Path pass=tls.resolve("store-password.txt"),ca=tls.resolve("ca.p12"),caCert=tls.resolve("classroom-ca.crt"),server=tls.resolve("server.p12"),csr=tls.resolve("server.csr"),signed=tls.resolve("server-signed.crt");
        if(!Files.exists(pass)){if(Files.exists(ca)||Files.exists(server))throw new UserError("인증서 암호 파일이 없습니다. data/tls 백업을 복원하세요.");atomic(pass,random(24).getBytes(StandardCharsets.UTF_8));}
        if(!Files.exists(ca)){
            if(Files.exists(caCert))throw new UserError("교실 CA 개인 키가 없습니다. 기존 data/tls를 복원하세요.");
            runTool(tls,"-genkeypair",ca,pass,"classroom-ca","-dname","CN=Classroom Live Java LAN "+random(4),"-keyalg","RSA","-keysize","3072","-sigalg","SHA256withRSA","-validity","3650","-ext","BC:critical=ca:true,pathlen:0","-ext","KU:critical=keyCertSign,cRLSign");
        }
        runTool(tls,"-exportcert",ca,pass,"classroom-ca","-rfc","-file",caCert.toString());
        X509Certificate root=readCert(caCert);if(root.getNotAfter().getTime()<now()+370L*86400000)throw new UserError("교실 CA 만료가 가깝습니다. 새 CA와 학생 재등록을 준비하세요.");
        // Keep the original CA; issue a fresh server leaf for the exact LAN IP.
        Path staged=tls.resolve("server-next.p12");Files.deleteIfExists(staged);
        runTool(tls,"-genkeypair",staged,pass,"server","-dname","CN=Classroom Live LAN Server","-keyalg","RSA","-keysize","2048","-sigalg","SHA256withRSA","-validity","365");
        runTool(tls,"-certreq",staged,pass,"server","-file",csr.toString());
        runTool(tls,"-gencert",ca,pass,"classroom-ca","-infile",csr.toString(),"-outfile",signed.toString(),"-rfc","-sigalg","SHA256withRSA","-validity","365","-ext","BC:critical=ca:false","-ext","KU:critical=digitalSignature,keyEncipherment","-ext","EKU=serverAuth","-ext","SAN=IP:"+ip+",IP:127.0.0.1,DNS:localhost");
        runTool(tls,"-importcert",staged,pass,"classroom-ca","-file",caCert.toString(),"-noprompt");
        runTool(tls,"-importcert",staged,pass,"server","-file",signed.toString(),"-noprompt");
        Files.move(staged,server,StandardCopyOption.REPLACE_EXISTING);for(Path p:List.of(ca,server,pass))privateFile(p);Files.deleteIfExists(csr);Files.deleteIfExists(signed);
        return HexFormat.of().withUpperCase().formatHex(MessageDigest.getInstance("SHA-256").digest(root.getEncoded()));
    }
    static X509Certificate readCert(Path p)throws Exception{try(InputStream in=Files.newInputStream(p)){return (X509Certificate)java.security.cert.CertificateFactory.getInstance("X.509").generateCertificate(in);}}
    static void studentPack(Path dir,Map<String,Object> cfg,String fingerprint)throws Exception{
        Path pack=dir.resolve("STUDENT_SETUP.zip");String url="https://"+str(cfg.get("server_ip"))+":"+num(cfg.get("port"))+"/";
        String ps="""
            $ErrorActionPreference = 'Stop'
            Set-Location $PSScriptRoot
            $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new((Join-Path $PSScriptRoot 'classroom-ca.crt'))
            $sha = [System.Security.Cryptography.SHA256]::Create()
            $actual = ([BitConverter]::ToString($sha.ComputeHash($cert.RawData))).Replace('-','')
            if ($actual -ne '__FINGERPRINT__') { throw 'Certificate fingerprint mismatch. Ask your teacher for the original ZIP.' }
            Write-Host 'Classroom Live Java LAN - classroom certificate registration for this Windows user.'
            Write-Host "SHA256: $actual"
            Write-Host 'Install only the original ZIP supplied by your classroom administrator.'
            $answer = Read-Host 'Type YES to install this classroom certificate'
            if ($answer -cne 'YES') { exit 1 }
            Import-Certificate -FilePath '.\\classroom-ca.crt' -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null
            $url = '__URL__'
            $shortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Classroom Live LAN.url'
            Set-Content -Path $shortcut -Value "[InternetShortcut]`r`nURL=$url" -Encoding ASCII
            Write-Host 'Installed. Close ALL Chrome/Edge windows and reopen the classroom address in Chrome.'
            Write-Host $url
            """.replace("__FINGERPRINT__",fingerprint).replace("__URL__",url).replace("\n","\r\n");
        String cmd="@echo off\r\ncd /d \"%~dp0\"\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File \"%~dp0Install.ps1\"\r\npause\r\n";
        String readme="압축 해제 → Setup.cmd → YES 입력 → 교실 인증서 등록 승인 → Chrome 완전 종료 후 다시 실행\r\n접속 주소: "+url+"\r\n학생 PC에는 Java·Eclipse·Python이 필요 없습니다.\r\n교수님이 제공한 원본만 설치하세요. 학교 정책으로 막히면 학교 담당자에게 요청하세요.\r\nCA SHA256: "+fingerprint+"\r\n";
        try(ZipOutputStream out=new ZipOutputStream(Files.newOutputStream(pack),StandardCharsets.UTF_8)){
            for(var item:obj("Setup.cmd",cmd.getBytes(StandardCharsets.US_ASCII),"Install.ps1",ps.getBytes(StandardCharsets.UTF_8),"READ_ME.txt",readme.getBytes(StandardCharsets.UTF_8),"classroom-ca.crt",Files.readAllBytes(dir.resolve("tls/classroom-ca.crt"))).entrySet()){
                out.putNextEntry(new ZipEntry(item.getKey()));out.write((byte[])item.getValue());out.closeEntry();
            }
        }
    }
    static final Scanner INPUT=new Scanner(System.in,StandardCharsets.UTF_8);
    static String prompt(String message,String fallback){System.out.print(message+(fallback.isEmpty()?"": " ["+fallback+"]")+": ");String s=INPUT.hasNextLine()?INPUT.nextLine().strip():"";return s.isEmpty()?fallback:s;}
    static String password(String message){Console console=System.console();if(console!=null){char[] v=console.readPassword("%s: ",message);if(v==null)throw new UserError("입력이 취소되었습니다.");String s=new String(v);Arrays.fill(v,'\0');return s;}System.out.println("주의: 이 실행 환경에서는 비밀번호가 화면에 표시될 수 있습니다. CMD/터미널에서 직접 실행하는 것을 권장합니다.");return prompt(message,"");}
    static void setup(Path dir)throws Exception{
        Map<String,Object> old=Files.exists(dir.resolve("server.json"))?map(readJson(dir.resolve("server.json"))):obj();
        System.out.println("Classroom Live Java LAN 최초 설정\nWindows: ipconfig / Ubuntu: ip -4 addr 에서 서버의 실제 IPv4를 확인하세요.");
        String ip=prompt("서버 IPv4 (예: 192.168.22.156)",str(old.get("server_ip")));if(!privateIP(ipv4(ip)))throw new UserError("실제 교실 사설 IPv4를 입력하세요.");String defaultNet=ip.substring(0,ip.lastIndexOf('.'))+".0/24";if(old.get("allowed_cidrs") instanceof List&& !((List<?>)old.get("allowed_cidrs")).isEmpty())defaultNet=str(((List<?>)old.get("allowed_cidrs")).get(0));
        System.out.println("/24는 서브넷 마스크 255.255.255.0인 경우입니다. 실제 학교 대역으로 설정하세요.");String net=prompt("접속 허용 대역",defaultNet);if(!new Network(net).has(ip))throw new UserError("서버 IP가 포함된 교실 대역을 입력하세요.");String portText=prompt("접속 포트",old.containsKey("port")?Long.toString(num(old.get("port"))):"8443");int port=Integer.parseInt(portText);if(port<1024||port>65535)throw new UserError("포트는 1024~65535여야 합니다.");
        Map<String,Object> cfg=obj("server_ip",ip,"port",port,"allowed_cidrs",List.of(net),"signup_enabled",!old.containsKey("signup_enabled")||yes(old.get("signup_enabled")));
        Store store=new Store(dir);if(store.list("users").stream().noneMatch(u->yes(u.get("admin")))){String id=prompt("관리자 아이디 (영문/숫자 3자 이상)","");String pw=password("관리자 비밀번호 (12자 이상)");if(!pw.equals(password("비밀번호 확인")))throw new UserError("비밀번호가 다릅니다.");store.admin(id,pw);}
        System.out.println("교실 인증서를 만들고 있습니다. 잠시 기다려 주세요.");String fingerprint=certificates(dir,ip);writeJson(dir.resolve("server.json"),cfg);studentPack(dir,cfg,fingerprint);
        System.out.println("설정 완료: https://"+ip+":"+port+"/\n학생에게 보낼 파일: data/STUDENT_SETUP.zip\n전체 서버 폴더와 data/tls는 학생에게 보내지 마세요.\nCA SHA256: "+fingerprint);
    }
    public static void main(String[] args)throws Exception{
        String command=args.length>0?args[0]:"serve";Path dir=base.resolve("data");for(int i=1;i<args.length;i++){if(args[i].equals("--data")&&i+1<args.length)dir=Path.of(args[++i]).toAbsolutePath();else if(args[i].equals("--home")&&i+1<args.length)base=Path.of(args[++i]).toAbsolutePath();else throw new UserError("명령 인수를 확인하세요.");}
        if(command.equals("check")){System.out.println("Java "+System.getProperty("java.version")+" / "+System.getProperty("java.home"));System.out.println("Certificate tool: "+keytool());return;}
        if(!Set.of("setup","serve","serve-managed","backup","reset-password").contains(command)){System.err.println("사용법: java -jar ClassroomLive.jar setup|serve|backup|reset-password");System.exit(1);}
        Files.createDirectories(dir);
        // One process owns this data directory. Administrative CLI changes require stopping the server.
        try(FileChannel lockFile=FileChannel.open(dir.resolve("server.lock"),StandardOpenOption.CREATE,StandardOpenOption.WRITE)){
            FileLock lock=lockFile.tryLock();if(lock==null)throw new UserError("서버가 이미 실행 중입니다. 설정·백업·비밀번호 변경 전에 서버를 Ctrl+C로 종료하세요.");
            try(lock){
                if(command.equals("setup")){setup(dir);return;}
                if(!Files.exists(dir.resolve("classroom-data.json")))throw new UserError("먼저 01-Setup.cmd를 실행하세요.");Store store=new Store(dir);
                if(command.equals("backup")){System.out.println("백업 완료: "+store.backup(dir));return;}
                if(command.equals("reset-password")){String id=prompt("비밀번호를 바꿀 아이디","");String pw=password("새 비밀번호 (8자 이상)");if(!pw.equals(password("새 비밀번호 확인")))throw new UserError("비밀번호가 다릅니다.");store.reset(id,pw);System.out.println("변경 완료. 다음 서버 실행 후 새 비밀번호로 로그인하세요.");return;}
                Map<String,Object> cfg=config(dir);X509Certificate cert;char[] pw=Files.readString(dir.resolve("tls/store-password.txt"),StandardCharsets.UTF_8).strip().toCharArray();KeyStore ks=KeyStore.getInstance("PKCS12");try(InputStream in=Files.newInputStream(dir.resolve("tls/server.p12"))){ks.load(in,pw);}cert=(X509Certificate)ks.getCertificate("server");Arrays.fill(pw,'\0');if(cert.getNotAfter().getTime()<now()+30L*86400000){System.out.println("서버 인증서를 갱신합니다.");String fp=certificates(dir,str(cfg.get("server_ip")));studentPack(dir,cfg,fp);}
                // Bound request time prevents idle clients occupying worker threads indefinitely.
                System.setProperty("sun.net.httpserver.maxReqTime","15");System.setProperty("sun.net.httpserver.maxRspTime","30");System.setProperty("sun.net.httpserver.idleInterval","15");System.setProperty("sun.net.httpserver.maxConnections","96");
                Service service=new Service(cfg,store,dir,(int)num(cfg.get("port")));Thread shutdown=new Thread(service::close);Runtime.getRuntime().addShutdownHook(shutdown);service.start();
                System.out.println("Classroom Live Java LAN 실행: https://"+cfg.get("server_ip")+":"+num(cfg.get("port"))+"/\n허용 대역: "+cfg.get("allowed_cidrs")+"\n종료: Ctrl+C / 서버 전원과 창을 켜 두세요. 영상은 녹화하지 않습니다.");
                try {
                    if(command.equals("serve-managed")) {
                        // Private parent-child stdin pipe only; no remote shutdown endpoint.
                        try(var input=new BufferedReader(new InputStreamReader(System.in,StandardCharsets.UTF_8))) {
                            String line;while((line=input.readLine())!=null)if(line.equals("STOP"))break;
                        }
                    } else new CountDownLatch(1).await();
                } finally {
                    service.close();
                    try{Runtime.getRuntime().removeShutdownHook(shutdown);}catch(IllegalStateException ignored){}
                }
            }
        }catch(UserError ex){System.err.println("설정 오류: "+ex.getMessage());System.exit(1);}catch(BindException ex){System.err.println("서버 포트를 다른 프로그램이 사용 중입니다. 기존 서버를 종료하거나 setup에서 다른 포트를 선택하세요.");System.exit(1);}catch(Exception ex){System.err.println("실행 오류: "+ex.getClass().getSimpleName()+": "+ex.getMessage()+"\n처음 설정은 01-Setup.cmd, 자세한 설명은 START_HERE.html을 확인하세요.");System.exit(1);}
    }
}
