import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.concurrent.*;
import java.util.function.*;

/** Owns exactly one child, with graceful shutdown through its private stdin pipe. */
public final class ManagedServer {
    private Process child;
    public synchronized boolean isRunning(){return child!=null&&child.isAlive();}
    public synchronized void start(Path home,Consumer<String> log,IntConsumer exited)throws IOException {
        if(isRunning())throw new IOException("이 앱에서 서버가 이미 실행 중입니다.");
        Path java=Path.of(System.getProperty("java.home"),"bin",System.getProperty("os.name").startsWith("Windows")?"javaw.exe":"java");
        Process p=new ProcessBuilder(java.toString(),"-Dfile.encoding=UTF-8","--add-modules","jdk.httpserver","-jar",home.resolve("ClassroomLive.jar").toString(),"serve-managed")
            .directory(home.toFile()).redirectErrorStream(true).start();child=p;
        Thread reader=new Thread(()->{
            try(var lines=new BufferedReader(new InputStreamReader(p.getInputStream(),StandardCharsets.UTF_8))){String line;while((line=lines.readLine())!=null)log.accept(line);}
            catch(IOException e){log.accept("실행 기록 읽기: "+e.getMessage());}
            try{int code=p.waitFor();synchronized(this){if(child==p)child=null;}exited.accept(code);}
            catch(InterruptedException e){Thread.currentThread().interrupt();}
        },"classroom-server-output");reader.setDaemon(true);reader.start();
    }
    public synchronized void requestStop()throws IOException {
        if(!isRunning())return;
        child.getOutputStream().write("STOP\n".getBytes(StandardCharsets.UTF_8));child.getOutputStream().flush();
    }
    public boolean awaitStop(long timeout,TimeUnit unit)throws InterruptedException {
        Process p;synchronized(this){p=child;}return p==null||p.waitFor(timeout,unit);
    }
    public synchronized void closePipe()throws IOException {if(isRunning())child.getOutputStream().close();}
}
