import java.nio.file.*;
import java.net.*;
import java.net.http.*;
import java.security.*;
import javax.net.ssl.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

public class ManagedServerTests {
    static void check(boolean ok,String msg){if(!ok)throw new AssertionError(msg);}
    static void ready(ManagedServer server,HttpClient client,String origin)throws Exception{
        long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(20);
        while(System.nanoTime()<end){check(server.isRunning(),"child exited early");try{if(client.send(HttpRequest.newBuilder(URI.create(origin+"/api/health")).timeout(Duration.ofSeconds(2)).GET().build(),HttpResponse.BodyHandlers.ofString()).statusCode()==200)return;}catch(Exception ignored){}Thread.sleep(100);}
        throw new AssertionError("HTTPS health timeout");
    }
    public static void main(String[] args)throws Exception{
        Path home=Files.createTempDirectory("교실 server app test ");Path data=home.resolve("data");Files.createDirectories(data);ManagedServer managed=new ManagedServer();
        try{
            Files.copy(Path.of("ClassroomLive.jar"),home.resolve("ClassroomLive.jar"));
            ClassroomServer.Store store=new ClassroomServer.Store(data);store.admin("teacher","TeacherPassword-123");
            String fingerprint=ClassroomServer.certificates(data,"192.168.22.50");int port;try(var socket=new java.net.ServerSocket(0)){port=socket.getLocalPort();}
            var cfg=ClassroomServer.obj("server_ip","192.168.22.50","port",port,"allowed_cidrs",List.of("192.168.22.0/24"),"signup_enabled",true);
            ClassroomServer.writeJson(data.resolve("server.json"),cfg);ClassroomServer.studentPack(data,cfg,fingerprint);
            Map<Path,byte[]> before=new HashMap<>();try(var paths=Files.walk(data)){for(Path p:paths.filter(Files::isRegularFile).toList())before.put(p,Files.readAllBytes(p));}
            KeyStore trust=KeyStore.getInstance(KeyStore.getDefaultType());trust.load(null);trust.setCertificateEntry("ca",ClassroomServer.readCert(data.resolve("tls/classroom-ca.crt")));
            TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(trust);SSLContext ssl=SSLContext.getInstance("TLS");ssl.init(null,tm.getTrustManagers(),null);
            HttpClient client=HttpClient.newBuilder().sslContext(ssl).connectTimeout(Duration.ofSeconds(2)).build();String origin="https://127.0.0.1:"+port;
            BlockingQueue<Integer> exits=new LinkedBlockingQueue<>();List<String> logs=new CopyOnWriteArrayList<>();
            managed.start(home,logs::add,exits::add);ready(managed,client,origin);
            // The existing file lock rejects a second launcher without killing the running server.
            ManagedServer duplicate=new ManagedServer();duplicate.start(home,logs::add,exits::add);check(duplicate.awaitStop(10,TimeUnit.SECONDS),"duplicate exits");check(exits.poll(10,TimeUnit.SECONDS)==1,"duplicate error code");check(managed.isRunning(),"original survives duplicate");
            managed.requestStop();check(managed.awaitStop(10,TimeUnit.SECONDS),"graceful STOP");check(exits.poll(10,TimeUnit.SECONDS)==0,"STOP exits successfully");
            managed.start(home,logs::add,exits::add);ready(managed,client,origin);managed.closePipe();check(managed.awaitStop(10,TimeUnit.SECONDS),"parent pipe EOF stops child");check(exits.poll(10,TimeUnit.SECONDS)==0,"EOF exit code");
            for(var item:before.entrySet())check(Arrays.equals(item.getValue(),Files.readAllBytes(item.getKey())),"existing file untouched: "+item.getKey());
            check(logs.stream().anyMatch(s->s.contains("https://192.168.22.50:")),"configured address logged");
            System.out.println("PASS real JAR in Unicode/spaced path; trusted HTTPS; duplicate protection; graceful stop/restart; parent EOF; unchanged accounts/config/CA/student pack");
        }finally{managed.closePipe();managed.awaitStop(10,TimeUnit.SECONDS);try(var paths=Files.walk(home)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.deleteIfExists(p);}}
    }
}
