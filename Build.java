import javax.tools.ToolProvider;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
public class Build {
 public static void main(String[] args)throws Exception {
  var compiler=ToolProvider.getSystemJavaCompiler();if(compiler==null)throw new IllegalStateException("JDK 17+ required to rebuild; the prebuilt JAR does not require javac.");
  Path classes=Path.of("build/classes");Files.createDirectories(classes);
  int status=compiler.run(null,null,null,"--release","17","--add-modules","jdk.httpserver","-encoding","UTF-8","-d",classes.toString(),"src/ClassroomServer.java","src/ManagedServer.java","src/ServerControl.java");if(status!=0)System.exit(status);
  Manifest manifest=new Manifest();manifest.getMainAttributes().putValue("Manifest-Version","1.0");manifest.getMainAttributes().putValue("Main-Class","ClassroomServer");
  try(JarOutputStream out=new JarOutputStream(Files.newOutputStream(Path.of("ClassroomLive.jar")),manifest)){
   for(Path root:List.of(classes,Path.of("public"))){try(var walk=Files.walk(root)){for(Path p:walk.filter(Files::isRegularFile).sorted().toList()){String name=(root.equals(classes)?"":"public/")+root.relativize(p).toString().replace('\\','/');out.putNextEntry(new JarEntry(name));Files.copy(p,out);out.closeEntry();}}}
  }
  System.out.println("Built ClassroomLive.jar (Java 17+)");
  Manifest control=new Manifest();control.getMainAttributes().putValue("Manifest-Version","1.0");control.getMainAttributes().putValue("Main-Class","ServerControl");control.getMainAttributes().putValue("Class-Path","ClassroomLive.jar");
  try(JarOutputStream out=new JarOutputStream(Files.newOutputStream(Path.of("ServerControl.jar")),control)){
   try(var walk=Files.walk(classes)){for(Path p:walk.filter(Files::isRegularFile).filter(p->p.getFileName().toString().startsWith("ServerControl")||p.getFileName().toString().startsWith("ManagedServer")).sorted().toList()){out.putNextEntry(new JarEntry(classes.relativize(p).toString().replace('\\','/')));Files.copy(p,out);out.closeEntry();}}
  }
  if(args.length>0&&args[0].equals("test")){
   Files.createDirectories(Path.of("build/test-classes"));
   int test=compiler.run(null,null,null,"--release","17","--add-modules","jdk.httpserver","-encoding","UTF-8","-classpath",classes.toString(),"-d","build/test-classes","tests/ServerTests.java","tests/ManagedServerTests.java");if(test!=0)System.exit(test);
  }
 }
}
