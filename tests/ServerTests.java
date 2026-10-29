import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.net.*;
import java.net.http.*;
import javax.net.ssl.*;
import java.security.*;
import java.security.cert.CertificateFactory;
import java.util.zip.*;
public class ServerTests {
 static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
 static void failure(Runnable run,String phrase){try{run.run();throw new AssertionError("Expected failure: "+phrase);}catch(ClassroomServer.UserError e){check(e.getMessage().contains(phrase),e.getMessage());}}
 static Map<String,Object> m(Object... a){return ClassroomServer.obj(a);}
 static Map<String,Object> map(Object v){return ClassroomServer.map(v);}
 static String s(Object v){return ClassroomServer.str(v);}
 static String cid(){return UUID.randomUUID().toString();}
 static Object rpc(ClassroomServer.Store db,String token,String name,Map<String,Object> a){try{return db.rpc(token,name,a);}catch(java.io.IOException e){throw new RuntimeException(e);}}
 static Map<String,Object> args(Map<String,Object> room,String client){return m("p_room",room.get("room_id"),"p_client",client);}
 static Map<String,Object> add(Map<String,Object> a,Object... rest){Map<String,Object> result=new LinkedHashMap<>(a);result.putAll(m(rest));return result;}
 static ClassroomServer.Store.Auth signup(ClassroomServer.Store db,int n)throws Exception{return db.auth("signup",m("login","student"+n,"password","StudentPassword123","nickname","Student "+n),"","pc"+n,true);}
 static void cleanup(Path root)throws Exception{try(var stream=Files.walk(root)){for(Path p:stream.sorted(Comparator.reverseOrder()).toList())Files.deleteIfExists(p);}}
 public static void main(String[] args)throws Exception{
  Path dir=Files.createTempDirectory("classroom-java-test-");
  if(args.length>0&&args[0].equals("fixture")){
   ClassroomServer.certificates(dir,"192.168.22.156");ClassroomServer.Store db=new ClassroomServer.Store(dir);db.admin("teacher","TeacherPassword-123");
   ClassroomServer.Service service=new ClassroomServer.Service(m("server_ip","192.168.22.156","port",8443,"allowed_cidrs",List.of("192.168.22.0/24"),"signup_enabled",true),db,dir,0);
   service.start();System.out.println(ClassroomServer.Json.encode(m("port",service.port,"ca",dir.resolve("tls/classroom-ca.crt").toString())));System.out.flush();Runtime.getRuntime().addShutdownHook(new Thread(()->{service.close();try{cleanup(dir);}catch(Exception ignored){}}));new CountDownLatch(1).await();return;
  }
  try{
   ClassroomServer.Store db=new ClassroomServer.Store(dir);db.admin("teacher","TeacherPassword-123");failure(()->{try{db.admin("other","LongPassword12345");}catch(java.io.IOException e){throw new RuntimeException(e);}},"이미");
   var admin=db.auth("login",m("login","teacher","password","TeacherPassword-123"),"","teacherpc",true);String at=admin.cookie(),aid=s(map(admin.data().get("user")).get("id"));
   List<ClassroomServer.Store.Auth> people=new ArrayList<>();for(int n=0;n<8;n++){var p=signup(db,n);check(!p.data().containsKey("error"),"signup");people.add(p);}
   String bt=people.get(0).cookie(),bid=s(map(people.get(0).data().get("user")).get("id")),ca=cid(),cb=cid();
   failure(()->rpc(db,"","live_list_rooms",m()),"로그인");failure(()->rpc(db,bt,"live_admin_list_users",m()),"관리자만");
   Map<String,Object> room=map(rpc(db,at,"live_create_room",m("p_title","Class A","p_password","classpass","p_client",ca)));
   failure(()->rpc(db,bt,"live_create_room",m("p_title"," class a ","p_password","classpass","p_client",cid())),"이미 사용");
   Map<String,Object> ar=args(room,ca),br=args(room,cb);
   rpc(db,bt,"live_join_room_by_name",m("p_room_name","class a","p_password","classpass","p_client",cb));failure(()->rpc(db,people.get(1).cookie(),"live_room_state",br),"만료");
   rpc(db,bt,"live_send_message",add(br,"p_body","  int a = 1;\n  a++; <script>","p_is_code",true));Map<String,Object> snapshot=map(rpc(db,at,"live_room_state",ar));List<?> msgs=(List<?>)snapshot.get("messages");check(s(map(msgs.get(0)).get("body")).equals("  int a = 1;\n  a++; <script>"),"Code whitespace");check(Boolean.TRUE.equals(map(msgs.get(0)).get("is_code")),"code type");check(!ClassroomServer.Json.encode(snapshot).contains("password"),"room secret isolation");
   failure(()->rpc(db,bt,"live_close_room",m("p_room",room.get("room_id"))),"만든 사람");
   rpc(db,bt,"live_set_nickname",m("p_nickname","한글 English"));check(s(map(rpc(db,bt,"live_account_status",m())).get("nickname")).equals("한글 English"),"English nickname");
   String epoch=s(map(rpc(db,at,"live_share",add(ar,"p_start",true))).get("epoch"));failure(()->rpc(db,bt,"live_share",add(br,"p_start",true)),"다른 사람");
   Map<String,Object> sig=add(br,"p_target",ca,"p_epoch",epoch,"p_kind","watch","p_payload",m("connectionId",cid(),"data",m()));rpc(db,bt,"live_send_signal",sig);
   check(((List<?>)map(rpc(db,at,"live_room_state",ar)).get("signals")).size()==1,"publisher receives signal");check(((List<?>)map(rpc(db,bt,"live_room_state",br)).get("signals")).isEmpty(),"recipient isolation");failure(()->rpc(db,bt,"live_send_signal",add(sig,"p_kind","offer")),"허용");rpc(db,at,"live_share",add(ar,"p_start",false));failure(()->rpc(db,bt,"live_send_signal",sig),"종료");
   System.out.println("PASS account, private RPC, room uniqueness/password/name join, code chat, ownership, nickname, exclusive sharing and private/stale signaling");
   // Capacity is serialized for simultaneous joins: 8 including professor, never 9.
   var pool=Executors.newFixedThreadPool(7);List<Future<Boolean>> results=new ArrayList<>();for(int n=1;n<8;n++){final int i=n;results.add(pool.submit(()->{try{rpc(db,people.get(i).cookie(),"live_join_room",m("p_code",room.get("code"),"p_password","classpass","p_client",cid()));return true;}catch(ClassroomServer.UserError e){check(e.getMessage().contains("최대 8명"),"capacity reason");return false;}}));}int count=0;for(var f:results)if(f.get())count++;pool.shutdown();check(count==6,"exactly six remaining slots");check(((List<?>)map(rpc(db,at,"live_room_state",ar)).get("members")).size()==8,"8 concurrent participants");
   var lockUser=signup(db,99);for(int i=0;i<8;i++)check(map(rpc(db,lockUser.cookie(),"live_join_room",m("p_code",room.get("code"),"p_password","wrong","p_client",cid()))).containsKey("error"),"bad join");check(s(map(rpc(db,lockUser.cookie(),"live_join_room",m("p_code",room.get("code"),"p_password","classpass","p_client",cid()))).get("error")).contains("5분"),"join lockout");
   for(int i=0;i<8;i++)check(db.auth("login",m("login","student0","password","wrongpass"),"","attacker",true).data().containsKey("error"),"bad login");check(s(db.auth("login",m("login","student0","password","StudentPassword123"),"","attacker",true).data().get("error")).contains("5분"),"login lockout");check(db.auth("signup",m("login","closed","password","StudentPassword123","nickname","X"),"","closed",false).data().containsKey("error"),"signup closed");
   System.out.println("PASS concurrent capacity and join/login rate limits");
   rpc(db,bt,"live_share",add(br,"p_start",true));rpc(db,at,"live_admin_set_suspension",m("p_user",bid,"p_suspended",true));failure(()->rpc(db,bt,"live_list_rooms",m()),"이용 정지");check(map(map(rpc(db,at,"live_room_state",ar)).get("room")).get("share_client")==null,"suspension revokes publisher");rpc(db,at,"live_admin_set_suspension",m("p_user",bid,"p_suspended",false));rpc(db,bt,"live_join_room",m("p_code",room.get("code"),"p_password","classpass","p_client",cb));rpc(db,at,"live_admin_kick",m("p_room",room.get("room_id"),"p_user",bid));failure(()->rpc(db,bt,"live_room_state",br),"만료");failure(()->rpc(db,at,"live_admin_set_suspension",m("p_user",aid,"p_suspended",true)),"관리자 계정");
   var reopened=new ClassroomServer.Store(dir);check(reopened.list("users").size()==10,"accounts survive restart");check(reopened.list("messages").size()==1,"chat survives restart");check(reopened.list("rooms").size()==1,"room survives restart");check(s(reopened.find("users","id",bid).get("nickname")).equals("한글 English"),"profile persists");check(reopened.members.isEmpty()&&reopened.sessions.isEmpty(),"restart clears ephemeral sessions and live membership");String disk=Files.readString(dir.resolve("classroom-data.json"));check(!disk.contains("TeacherPassword-123")&&!disk.contains("StudentPassword123")&&!disk.contains(at),"no plaintext credentials or tokens on disk");check(disk.contains("pbkdf2$600000$"),"salted password hashes");check(Files.isRegularFile(db.backup(dir)),"backup");
   db.reset("student0","NewStudentPassword123");failure(()->rpc(db,bt,"live_list_rooms",m()),"로그인");check(!db.auth("login",m("login","student0","password","NewStudentPassword123"),"","fresh",true).data().containsKey("error"),"password reset");
   rpc(db,at,"live_admin_delete_room",m("p_room",room.get("room_id")));check(db.list("messages").isEmpty(),"room delete cascades chat");failure(()->rpc(db,people.get(1).cookie(),"live_room_state",args(room,ca)),"삭제");
   System.out.println("PASS single owner admin, suspend/restore, kick/delete, atomic persistence, safe backup, password reset and session invalidation");
   // Real certificate issuance and HTTPS requests with CA + hostname validation.
   String fp=ClassroomServer.certificates(dir,"192.168.22.156");byte[] caBefore=Files.readAllBytes(dir.resolve("tls/classroom-ca.crt"));
   Map<String,Object> cfg=m("server_ip","192.168.22.156","port",8443,"allowed_cidrs",List.of("192.168.22.0/24"),"signup_enabled",true);ClassroomServer.studentPack(dir,cfg,fp);
   try(ZipFile zip=new ZipFile(dir.resolve("STUDENT_SETUP.zip").toFile())){check(zip.size()==4,"student pack size");check(zip.getEntry("classroom-ca.crt")!=null&&zip.getEntry("Setup.cmd")!=null&&zip.getEntry("Install.ps1")!=null&&zip.getEntry("READ_ME.txt")!=null,"public pack only");String install=new String(zip.getInputStream(zip.getEntry("Install.ps1")).readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);check(install.contains(fp)&&install.contains("https://192.168.22.156:8443/"),"student fingerprint + URL");}
   KeyStore trust=KeyStore.getInstance(KeyStore.getDefaultType());trust.load(null);trust.setCertificateEntry("classroom",ClassroomServer.readCert(dir.resolve("tls/classroom-ca.crt")));TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(trust);SSLContext ctx=SSLContext.getInstance("TLS");ctx.init(null,tm.getTrustManagers(),null);HttpClient http=HttpClient.newBuilder().sslContext(ctx).connectTimeout(java.time.Duration.ofSeconds(10)).build();
   try(var service=new ClassroomServer.Service(cfg,db,dir,0)){service.start();String origin="https://127.0.0.1:"+service.port;var response=post(http,origin,"/api/login",m("login","teacher","password","TeacherPassword-123"),null,true);check(response.statusCode()==200,"real HTTPS login: "+response.body());String cookie=response.headers().firstValue("Set-Cookie").orElseThrow();check(cookie.contains("HttpOnly")&&cookie.contains("Secure")&&cookie.contains("SameSite=Strict"),"secure cookie");cookie=cookie.split(";")[0];check(post(http,origin,"/api/rpc",m("name","live_list_rooms","args",m()),cookie,true).statusCode()==200,"cookie RPC");check(post(http,origin,"/api/rpc",m("name","live_list_rooms","args",m()),cookie,false).statusCode()==403,"CSRF protection");for(String path:List.of("/","/help","/guide.js","/guide.css","/web/app.js","/web/languages.js","/classroom-ca.crt")){check(http.send(HttpRequest.newBuilder(URI.create(origin+path)).GET().build(),HttpResponse.BodyHandlers.ofString()).statusCode()==200,"asset "+path);}for(String path:List.of("/data/classroom-data.json","/data/tls/ca.p12","/data/tls/store-password.txt","/src/ClassroomServer.java")){check(http.send(HttpRequest.newBuilder(URI.create(origin+path)).GET().build(),HttpResponse.BodyHandlers.ofString()).statusCode()==404,"private files "+path);}check(!service.allowed(InetAddress.getByName("8.8.8.8")),"external IP denied");check(service.allowed(InetAddress.getByName("192.168.22.55")),"classroom subnet allowed");check(!service.allowed(InetAddress.getByName("192.168.23.55")),"other subnet denied");post(http,origin,"/api/logout",m(),cookie,true);check(post(http,origin,"/api/rpc",m("name","live_list_rooms","args",m()),cookie,true).statusCode()==400,"logout invalidates cookie");}
   System.out.println("PASS real keytool CA/server TLS chain, HTTPS login/cookie/API, CSRF/subnet/private-file protection, student public-only installer ZIP");
   // Bounded parser rejects malformed, duplicate fields and deep objects.
   for(String bad:List.of("{\"a\":1,\"a\":2}","[01]","{\"a\":true} x","{")){failure(()->ClassroomServer.Json.parse(bad),"JSON");}check(ClassroomServer.Json.encode(ClassroomServer.Json.parse("{\"a\":\"한글\\nEnglish\",\"b\":null}")).contains("한글"),"Unicode JSON");
   System.out.println("ALL JAVA BACKEND / HTTPS / SETUP TESTS PASSED");
  }finally{cleanup(dir);}
 }
 static HttpResponse<String> post(HttpClient client,String origin,String path,Map<String,Object> body,String cookie,boolean goodOrigin)throws Exception{HttpRequest.Builder b=HttpRequest.newBuilder(URI.create(origin+path)).header("Content-Type","application/json").header("X-Classroom-Request","1").header("Origin",goodOrigin?origin:"https://evil.example").POST(HttpRequest.BodyPublishers.ofString(ClassroomServer.Json.encode(body)));if(cookie!=null)b.header("Cookie",cookie);return client.send(b.build(),HttpResponse.BodyHandlers.ofString());}
}
