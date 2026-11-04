"""Check the actual inverse battlefield transform without SDL. Pass patched VCMI root."""
from pathlib import Path
import subprocess
import tempfile
import sys
text=(Path(sys.argv[1])/'client/battle/BattleWindow.cpp').read_text()
a=text.index('Point BattleWindow::mobileInputPoint(')
b=text.index('\nvoid BattleWindow::setupMobile()',a)
method=text[a:b]
fixture=r'''
#include <cassert>
struct Point{int x,y;Point(int x,int y):x(x),y(y){}};
struct Rect{int x,y,w,h;bool isInside(Point p)const{return p.x>=x&&p.y>=y&&p.x<x+w&&p.y<y+h;}};
struct BattleWindow{bool mobilePanel=false;Rect mobileField{0,0,800,556};Rect mobileSource{0,0,800,556};Point mobileInputPoint(const Point &)const;};
'''+method+r'''
int main(){
 BattleWindow window;
 auto desktop=window.mobileInputPoint(Point(200,350));assert(desktop.x==200&&desktop.y==350);
 window.mobilePanel=true;
 for(auto rect:{Rect{50,90,388,270},Rect{35,100,560,389},Rect{16,64,800,556}}){
  window.mobileField=rect;window.mobileSource=Rect{0,0,800,556};
  auto corner=window.mobileInputPoint(Point(rect.x,rect.y));assert(corner.x==0&&corner.y==0);
  auto outside=window.mobileInputPoint(Point(rect.x-1,rect.y));assert(outside.x<0&&outside.y<0);
  outside=window.mobileInputPoint(Point(rect.x+rect.w,rect.y+rect.h));assert(outside.x<0);
  for(int row=0;row<11;++row)for(int col=1;col<16;++col){
   int x=14+(row%2==0?22:0)+44*col+22,y=86+42*row+20;
   auto mapped=window.mobileInputPoint(Point(rect.x+x*rect.w/800,rect.y+y*rect.h/556));
   assert(mapped.x<=x&&x-mapped.x<=3);assert(mapped.y<=y&&y-mapped.y<=3);
  }
 }
 window.mobileField=Rect{50,80,400,250};window.mobileSource=Rect{200,150,400,250};
 auto cropped=window.mobileInputPoint(Point(100,130));assert(cropped.x==250&&cropped.y==200);
}
'''
with tempfile.TemporaryDirectory() as folder:
 p=Path(folder)/'test.cpp';p.write_text(fixture);binary=Path(folder)/'test'
 subprocess.run(['c++','-std=c++17','-include','initializer_list',str(p),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
print('PASS: phone/tablet hex centers map back to original battlefield coordinates; margins rejected; desktop unchanged')
