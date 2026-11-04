"""Exercise the patched WindowHandler ownership paths without SDL or game assets.
Usage: python3 tests/native/window-retirement.py /path/to/patched/vcmi
"""
import pathlib
import subprocess
import sys
import tempfile

source = pathlib.Path(sys.argv[1]) / 'client/gui'
implementation = (source / 'WindowHandler.cpp').read_text()

def method(signature):
    start = implementation.index(signature)
    opening = implementation.index('{', start)
    depth = 1
    end = opening + 1
    while depth:
        depth += (implementation[end] == '{') - (implementation[end] == '}')
        end += 1
    return implementation[start:end]

fixture = r'''
#include <cassert>
#include <memory>
#include <vector>
#include <algorithm>
struct IShowActivatable {
 bool active=false;
 int & destroyed;
 explicit IShowActivatable(int & count):destroyed(count) {}
 virtual ~IShowActivatable(){++destroyed;}
 void activate(){active=true;}
 void deactivate(){active=false;}
};
#include "WindowHandler.h"
namespace vstd {template<class T> bool contains(const std::vector<T>& list,const T& value){return std::find(list.begin(),list.end(),value)!=list.end();}}
struct Gui {void fakeMouseMove(){}} GH;
struct Cursor {enum class Map {POINTER};};
struct CursorHandler {void set(Cursor::Map){}} cursor;
struct Services {CursorHandler *curh=&cursor;} services;
auto CCS=&services;
int *screenBuf=nullptr,*screen2=nullptr;
void WindowHandler::totalRedraw(){}
'''
for signature in [
    'void WindowHandler::pushWindow(', 'void WindowHandler::popWindows(',
    'void WindowHandler::retireGameWindowsForBrowserTeardown()',
    'void WindowHandler::onFrameRendered()', 'size_t WindowHandler::count() const',
]:
    fixture += '\n' + method(signature)
fixture += r'''
int main(){
 int destroyed=0;
 {
  WindowHandler windows;
  auto map=std::make_shared<IShowActivatable>(destroyed);
  auto town=std::make_shared<IShowActivatable>(destroyed);
  windows.pushWindow(map);windows.pushWindow(town);
  assert(!map->active && town->active);
  windows.retireGameWindowsForBrowserTeardown();
  assert(windows.count()==0 && !map->active && !town->active);
  map.reset();town.reset();
  windows.onFrameRendered();assert(destroyed==0);
  windows.pushWindow(std::make_shared<IShowActivatable>(destroyed));
  windows.popWindows(1);windows.onFrameRendered();
  assert(destroyed==1); // ordinary result dialogs still dispose normally
 }
 assert(destroyed==3); // retained session ownership released with handler
 {WindowHandler empty;empty.retireGameWindowsForBrowserTeardown();empty.onFrameRendered();}
}
'''
with tempfile.TemporaryDirectory() as directory:
    test = pathlib.Path(directory) / 'window-retirement.cpp'
    binary = pathlib.Path(directory) / 'window-retirement'
    test.write_text(fixture)
    subprocess.run(['c++', '-std=c++17', '-I', str(source), str(test), '-o', str(binary)], check=True)
    subprocess.run([str(binary)], check=True)
print('PASS: finished game windows stay inactive and alive; result dialogs dispose normally; ownership releases with session')
