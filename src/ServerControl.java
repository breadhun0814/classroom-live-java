import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.net.ssl.*;
import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.awt.event.*;
import java.net.*;
import java.io.*;
import java.nio.file.*;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.util.Map;
import java.util.concurrent.*;

/** Local desktop control panel. Does not change server config, database or certificates. */
public final class ServerControl {
    final Path home;final ManagedServer server=new ManagedServer();
    final JFrame frame=new JFrame("Classroom Live · 서버 관리");
    final JLabel status=new JLabel("● 중지됨"),address=new JLabel("설정 읽는 중");
    final JTextArea logs=new JTextArea();final JButton start=new JButton("▶ 서버 시작"),stop=new JButton("■ 서버 종료");
    final ScheduledExecutorService worker=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"server-control-health");t.setDaemon(true);return t;});
    URI url;int port;SSLContext ssl;volatile boolean stopping=false;boolean closing=false;volatile long generation=0;
    ServerControl(Path home)throws Exception{
        this.home=home;
        Map<String,Object> cfg=ClassroomServer.config(home.resolve("data"));
        port=(int)ClassroomServer.num(cfg.get("port"));url=URI.create("https://"+ClassroomServer.str(cfg.get("server_ip"))+":"+port+"/");
        KeyStore trust=KeyStore.getInstance(KeyStore.getDefaultType());trust.load(null,null);
        try(InputStream in=Files.newInputStream(home.resolve("data/tls/classroom-ca.crt"))){trust.setCertificateEntry("classroom",CertificateFactory.getInstance("X.509").generateCertificate(in));}
        TrustManagerFactory tm=TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());tm.init(trust);ssl=SSLContext.getInstance("TLS");ssl.init(null,tm.getTrustManagers(),null);
        frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);frame.setMinimumSize(new Dimension(780,510));frame.setSize(900,610);frame.setLocationRelativeTo(null);
        JPanel content=new JPanel(new BorderLayout(12,12));content.setBorder(new EmptyBorder(20,20,20,20));frame.setContentPane(content);
        JPanel top=new JPanel();top.setLayout(new BoxLayout(top,BoxLayout.Y_AXIS));
        JLabel title=new JLabel("Classroom Live 서버");title.setFont(title.getFont().deriveFont(Font.BOLD,25f));top.add(title);top.add(Box.createVerticalStrut(12));status.setFont(status.getFont().deriveFont(Font.BOLD,17f));top.add(status);
        address.setText(url.toString());address.setFont(address.getFont().deriveFont(16f));top.add(Box.createVerticalStrut(8));top.add(address);top.add(Box.createVerticalStrut(8));top.add(new JLabel("학생 PC 설정은 그대로 · 수업 중에는 이 앱과 서버 PC를 켜 두세요."));content.add(top,BorderLayout.NORTH);
        logs.setEditable(false);logs.setFont(new Font(Font.MONOSPACED,Font.PLAIN,13));logs.setLineWrap(true);logs.setWrapStyleWord(true);content.add(new JScrollPane(logs),BorderLayout.CENTER);
        JPanel bottom=new JPanel(new BorderLayout(6,6)),buttons=new JPanel(new FlowLayout(FlowLayout.LEFT,8,4));
        buttons.add(start);buttons.add(stop);stop.setEnabled(false);
        JButton open=new JButton("사이트 열기"),copy=new JButton("주소 복사"),folder=new JButton("서버 폴더"),pack=new JButton("학생 설치팩 위치");
        for(JButton b:new JButton[]{open,copy,folder,pack})buttons.add(b);
        bottom.add(buttons,BorderLayout.CENTER);bottom.add(new JLabel("창의 X를 누르면 종료 여부를 확인합니다. 최소화하면 서버는 계속 실행됩니다."),BorderLayout.SOUTH);content.add(bottom,BorderLayout.SOUTH);
        start.addActionListener(e->start());stop.addActionListener(e->confirmStop(false));
        open.addActionListener(e->desktop(()->Desktop.getDesktop().browse(url)));
        copy.addActionListener(e->{Toolkit.getDefaultToolkit().getSystemClipboard().setContents(new StringSelection(url.toString()),null);append("접속 주소를 복사했습니다.");});
        folder.addActionListener(e->desktop(()->Desktop.getDesktop().open(home.toFile())));
        pack.addActionListener(e->desktop(()->Desktop.getDesktop().open(home.resolve("data").toFile())));
        frame.addWindowListener(new WindowAdapter(){public void windowClosing(WindowEvent e){if(server.isRunning())confirmStop(true);else dispose();}});
        append("기존 서버가 02-Start.cmd에서 실행 중이라면 먼저 그 창에서 Ctrl+C로 종료하세요.");
        append("이 앱은 기존 data·주소·인증서를 변경하지 않습니다. 서버 시작 버튼을 누르세요.");
        Runtime.getRuntime().addShutdownHook(new Thread(()->{try{server.closePipe();server.awaitStop(5,TimeUnit.SECONDS);}catch(Exception ignored){}},"control-cleanup"));
        worker.scheduleWithFixedDelay(this::probe,1,2,TimeUnit.SECONDS);
    }
    interface IOAction{void run()throws Exception;}
    void desktop(IOAction action){try{action.run();}catch(Exception e){JOptionPane.showMessageDialog(frame,e.getMessage(),"열기 실패",JOptionPane.ERROR_MESSAGE);}}
    void append(String line){SwingUtilities.invokeLater(()->{logs.append(line+"\n");if(logs.getDocument().getLength()>100000)logs.replaceRange("",0,20000);logs.setCaretPosition(logs.getDocument().getLength());});}
    void start(){
        if(server.isRunning())return;stopping=false;closing=false;generation++;long run=generation;
        try{start.setEnabled(false);stop.setEnabled(true);status.setText("● 시작 중…");append("서버를 시작합니다.");
            server.start(home,this::append,code->SwingUtilities.invokeLater(()->{if(generation!=run)return;boolean expected=stopping;stopping=false;start.setEnabled(true);stop.setEnabled(false);status.setText(expected&&code==0?"● 중지됨":"● 종료됨 (코드 "+code+")");append("서버 프로세스 종료: "+code);if(closing)dispose();}));
        }catch(Exception e){start.setEnabled(true);stop.setEnabled(false);status.setText("● 시작 실패");append(e.getMessage());}
    }
    void confirmStop(boolean close){
        if(stopping){if(close)closing=true;return;}
        int answer=JOptionPane.showConfirmDialog(frame,"서버를 종료하면 모든 사용자의 연결이 끊깁니다.\n회원·방·채팅 기록은 보존됩니다. 종료할까요?","서버 종료",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE);
        if(answer!=JOptionPane.YES_OPTION)return;closing=close;stopping=true;status.setText("● 안전하게 종료 중…");stop.setEnabled(false);
        try{server.requestStop();}catch(IOException e){stopping=false;closing=false;stop.setEnabled(true);append("종료 요청 오류: "+e.getMessage());}
    }
    void probe(){
        if(!server.isRunning())return;long run=generation;boolean ready=false;
        try{HttpsURLConnection c=(HttpsURLConnection)URI.create("https://127.0.0.1:"+port+"/api/health").toURL().openConnection();
            c.setSSLSocketFactory(ssl.getSocketFactory());c.setConnectTimeout(1500);c.setReadTimeout(1500);c.setInstanceFollowRedirects(false);
            try{ready=c.getResponseCode()==200;}finally{c.disconnect();}
        }catch(Exception ignored){}
        final boolean ok=ready;SwingUtilities.invokeLater(()->{if(generation==run&&server.isRunning()&&!stopping)status.setText(ok?"● 실행 중 · HTTPS 응답 정상":"● 시작 중 / 응답 확인 중 · 실행 기록을 확인하세요");});
    }
    void dispose(){worker.shutdownNow();frame.dispose();System.exit(0);}
    public static void main(String[] args){
        Path home=args.length==1?Path.of(args[0]).toAbsolutePath():Path.of("").toAbsolutePath();
        SwingUtilities.invokeLater(()->{try{UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());new ServerControl(home).frame.setVisible(true);}
            catch(Exception e){JOptionPane.showMessageDialog(null,"기존 서버 폴더에 파일을 넣었는지 확인하세요.\nClassroomLive.jar와 data 폴더 옆에서 실행해야 합니다.\n\n"+e.getMessage(),"서버 관리 앱 시작 실패",JOptionPane.ERROR_MESSAGE);System.exit(1);}});
    }
}
