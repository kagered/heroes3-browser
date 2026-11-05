"""Exercise the actual createQueue policy for phone, tablet and desktop."""
from pathlib import Path
import subprocess
import tempfile
import sys
text=(Path(sys.argv[1])/'client/battle/BattleWindow.cpp').read_text();a=text.index('void BattleWindow::createQueue()');opening=text.index('{',a);depth=1;end=opening+1
while depth:
 depth+=(text[end]=='{')-(text[end]=='}');end+=1
method=text[a:end]
fixture=r'''
#include <cassert>
#include <memory>
#include <string>
#define OBJECT_CONSTRUCTION
struct Point{int x,y;};struct Rect{int y=0,h=600;};
int screenHeight=768;bool mobile=true,showQueue=true;std::string queueSize="auto";
struct CMessage{static bool isMobileSession(){return mobile;}};
struct Setting{std::string key;Setting operator[](const char * name){return {name};}bool Bool(){return showQueue;}std::string String(){return queueSize;}}settings;
struct Gui{Point screenDimensions(){return {1024,screenHeight};}}GH;
struct StackQueue{bool embedded;Rect pos;StackQueue(bool embed,int):embedded(embed){pos.h=embed?49:85;}void disable(){}};
struct BattleWindow{Rect pos;int owner=0;std::shared_ptr<StackQueue> queue;Rect center(){return pos;}void createQueue();};
'''+method+r'''
int main(){
 for(int height:{600,768,1024})for(auto size:{"auto","big","small"})for(bool shown:{false,true}){
  mobile=true;screenHeight=height;queueSize=size;showQueue=shown;BattleWindow window;window.createQueue();
  assert(window.queue->embedded);assert(window.pos.h==600&&window.pos.y==0);
 }
 mobile=false;showQueue=true;screenHeight=768;queueSize="big";
 BattleWindow desktop;desktop.createQueue();assert(!desktop.queue->embedded&&desktop.pos.h==685);
 screenHeight=600;BattleWindow compact;compact.createQueue();assert(compact.queue->embedded&&compact.pos.h==600);
}
'''
with tempfile.TemporaryDirectory() as directory:
 p=Path(directory)/'test.cpp';p.write_text(fixture);binary=Path(directory)/'test'
 subprocess.run(['c++','-std=c++17',str(p),'-o',str(binary)],check=True);subprocess.run([str(binary)],check=True)
print('PASS: mobile queue never expands/shifts the source window across phone/tablet sizes; desktop detached queue preserved')
