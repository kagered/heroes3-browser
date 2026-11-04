"""Exercise the actual native camera header with lightweight coordinate types."""
from pathlib import Path
import tempfile
import subprocess
import sys
header=Path(sys.argv[1])/'client/windows/MobileImageView.h'
with tempfile.TemporaryDirectory() as directory:
 root=Path(directory);(root/'client/windows').mkdir(parents=True);(root/'lib').mkdir()
 (root/'client/windows/MobileImageView.h').write_bytes(header.read_bytes())
 (root/'lib/Rect.h').write_text('''#pragma once
struct Point{int x,y;Point(int x=0,int y=0):x(x),y(y){}};
struct Rect{int x,y,w,h;Rect(int x=0,int y=0,int w=0,int h=0):x(x),y(y),w(w),h(h){}};
''')
 source=root/'test.cpp';source.write_text(r'''
#include "client/windows/MobileImageView.h"
#include <cassert>
int main(){
 for(auto size:{Point(800,556),Point(591,544)}){
  MobileImageCamera camera(size);Rect bounds(16,100,400,240);
  auto normal=camera.frame(bounds);
  assert(normal.first.w==400&&normal.first.h==240); // no downsampling at default zoom
  assert(normal.second.x==bounds.x&&normal.second.w==bounds.w);
  camera.pan(-10000,10000);auto edge=camera.frame(bounds);
  assert(edge.first.x==0&&edge.first.y+edge.first.h==size.y);
  camera.magnify(100);assert(camera.zoom==3);auto zoom=camera.frame(bounds);assert(zoom.first.w<normal.first.w);
  camera.magnify(0.0001);assert(camera.zoom==1);
  camera.overview=true;auto overview=camera.frame(bounds);
  assert(overview.first.w==size.x&&overview.first.h==size.y);
  assert(overview.second.w<=bounds.w&&overview.second.h<=bounds.h);
  assert(std::abs(double(overview.second.w)/overview.second.h-double(size.x)/size.y)<0.02);
  camera.pan(10,0);assert(!camera.overview);
 }
}
''')
 binary=root/'test';subprocess.run(['c++','-std=c++17','-I',str(root),str(source),'-o',str(binary)],check=True);subprocess.run([str(binary)],check=True)
print('PASS: original-pixel default, clamped edges/zoom, aspect-preserving overview and camera panning')
