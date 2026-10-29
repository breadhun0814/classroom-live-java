import javax.tools.ToolProvider;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;
public class Build {
 public static void main(String[] args)throws Exception {
  var compiler=ToolProvider.getSystemJavaCompiler();if(compiler==null)throw new IllegalStateException("JDK 17+ required to rebuild; the prebuilt JAR does not require javac.");
  Path classes=Path.of("build/classes");Files.createDirectories(classes);
  int status=compiler.run(null,null,null,"--release","17","--add-modules","jdk.httpserver","-encoding","UTF-8","-d",classes.toString(),"src/ClassroomServer.java");if(status!=0)System.exit(status);
  Manifest manifest=new Manifest();manifest.getMainAttributes().putValue("Manifest-Version","1.0");manifest.getMainAttributes().putValue("Main-Class","ClassroomServer");
  try(JarOutputStream out=new JarOutputStream(Files.newOutputStream(Path.of("ClassroomLive.jar")),manifest)){
   for(Path root:List.of(classes,Path.of("public"))){try(var walk=Files.walk(root)){for(Path p:walk.filter(Files::isRegularFile).sorted().toList()){String name=(root.equals(classes)?"":"public/")+root.relativize(p).toString().replace('\\','/');out.putNextEntry(new JarEntry(name));Files.copy(p,out);out.closeEntry();}}}
  }
  System.out.println("Built ClassroomLive.jar (Java 17+)");
  if(args.length>0&&args[0].equals("test")){
   Files.createDirectories(Path.of("build/test-classes"));
   int test=compiler.run(null,null,null,"--release","17","--add-modules","jdk.httpserver","-encoding","UTF-8","-classpath",classes.toString(),"-d","build/test-classes","tests/ServerTests.java");if(test!=0)System.exit(test);
  }
 }
}
