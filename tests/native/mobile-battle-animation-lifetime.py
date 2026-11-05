"""Run actual mobile drawing and hero tick methods with a lightweight event fixture."""
from pathlib import Path
import subprocess
import tempfile
import sys
root=Path(sys.argv[1])
def method(path,signature):
 text=(root/path).read_text();a=text.index(signature);b=text.index('{',a);depth=1;end=b+1
 while depth:
  depth+=(text[end]=='{')-(text[end]=='}');end+=1
 return text[a:end]
show=method('client/battle/BattleWindow.cpp','void BattleWindow::showMobile(')
tick=method('client/battle/BattleInterfaceClasses.cpp','void BattleHero::tick(')
prefix=r'''
#include <cassert>
#include <cstdint>
#include <memory>
#include <functional>
#include <vector>
using std::size_t;
struct Rect{int w=800,h=400;};struct ColorRGBA{ColorRGBA(int,int,int,int){}};
struct Canvas{template<class...T>void drawColor(T...){ }template<class...T>void drawScaled(T&&...){ }};
struct CIntObject{bool active=true;virtual ~CIntObject()=default;void disable(){active=false;}virtual void show(Canvas&){}void showAll(Canvas&){} };
struct Anim{size_t size(int)const{return 2;}};
struct BattleHero:CIntObject{
 int phase=0;float currentSpeed=2,currentFrame=0,flagCurrentFrame=0;
 std::shared_ptr<Anim> animation=std::make_shared<Anim>(),flagAnimation=animation;
 int completionCallbacks=0;void switchToNextPhase(){++completionCallbacks;}
 void tick(uint32_t);
};
struct CMessage{static Rect mobileScreenArea(){return Rect{};}};
struct Windows{void totalRedraw(){}};struct Gui{Windows windows(){return {};}}GH;
struct Setting{Setting operator[](const char*)const{return {};}bool Bool()const{return false;}}settings;
struct Owner{
 std::shared_ptr<CIntObject> fieldController=std::make_shared<CIntObject>();
 std::shared_ptr<BattleHero> attackingHero=std::make_shared<BattleHero>(),defendingHero=std::make_shared<BattleHero>();
};
struct BattleWindow{
 Owner owner;Rect pos,mobileFieldBounds,mobileSource,mobileField;
 std::shared_ptr<CIntObject> mobilePanel=std::make_shared<CIntObject>(),queue=std::make_shared<CIntObject>(),legacy=std::make_shared<CIntObject>();
 std::unique_ptr<Canvas> mobileBuffer=std::make_unique<Canvas>();
 std::vector<CIntObject*> children{owner.fieldController.get(),mobilePanel.get(),legacy.get()};
 std::vector<std::function<void()>> mobileRefreshers;
 void setupMobile(){}void showMobile(Canvas&);
};
'''
main=r'''
int main(){
 BattleWindow window;Canvas canvas;
 // A cast completion advances only through the hero's registered TIME events.
 for(int i=0;i<3;++i){
  window.showMobile(canvas);
  for(auto hero:{window.owner.attackingHero,window.owner.defendingHero})if(hero->active)hero->tick(1000);
 }
 assert(!window.legacy->active);
 assert(window.owner.fieldController->active&&window.mobilePanel->active);
 assert(window.owner.attackingHero->active&&window.owner.defendingHero->active);
 assert(window.owner.attackingHero->completionCallbacks==3);
 assert(window.owner.defendingHero->completionCallbacks==3);
}
'''
with tempfile.TemporaryDirectory() as directory:
 p=Path(directory)/'test.cpp';p.write_text(prefix+show+'\n'+tick+'\n'+main);binary=Path(directory)/'test'
 subprocess.run(['c++','-std=c++17',str(p),'-o',str(binary)],check=True)
 subprocess.run([str(binary)],check=True)
print('PASS: actual mobile drawing hides legacy UI while both heroes keep ticking and completing animation phases')
