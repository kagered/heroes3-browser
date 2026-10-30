#!/usr/bin/env python3
"""Generate the SVG monogram and pixel-matched fallbacks; Python standard library only."""
import struct,zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'src'
BG=(16,17,19);GOLD=(215,188,136);BORDER=tuple(round(a*.65+b*.35) for a,b in zip((191,164,115),BG))
COLUMNS=(13,26,39)
def rgb(size):
 output=bytearray();samples=4
 for y in range(size):
  for x in range(size):
   color=[0,0,0]
   for sy in range(samples):
    for sx in range(samples):
     px=(x+(sx+.5)/samples)*64/size;py=(y+(sy+.5)/samples)*64/size;c=BG
     if 3.5<=px<=60.5 and 3.5<=py<=60.5 and not(4.5<px<59.5 and 4.5<py<59.5):c=BORDER
     for start in COLUMNS:
      if (start<=px<start+12 and (16<=py<20 or 44<=py<48)) or (start+3<=px<start+9 and 20<=py<44):c=GOLD
     for k in range(3):color[k]+=c[k]
   output.extend(round(v/(samples*samples)) for v in color)
 return bytes(output)
def png(size):
 pixels=rgb(size)
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 rows=b''.join(b'\0'+pixels[y*size*3:(y+1)*size*3] for y in range(size))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
def ico(sizes=(16,32)):
 entries=[];images=[];offset=6+16*len(sizes)
 for size in sizes:
  pixels=rgb(size);bgra=bytearray()
  for y in reversed(range(size)):
   for x in range(size):
    i=(y*size+x)*3;r,g,b=pixels[i:i+3];bgra.extend((b,g,r,255))
  mask=b'\0'*(((size+31)//32)*4*size)
  image=struct.pack('<IiiHHIIiiII',40,size,size*2,1,32,0,len(bgra),0,0,0,0)+bgra+mask
  entries.append(struct.pack('<BBBBHHII',size,size,0,0,1,32,len(image),offset));images.append(image);offset+=len(image)
 return struct.pack('<HHH',0,1,len(sizes))+b''.join(entries)+b''.join(images)
if __name__=='__main__':
 paths=''.join(f'M{x} 16H{x+12}V20H{x+9}V44H{x+12}V48H{x}V44H{x+3}V20H{x}Z' for x in COLUMNS)
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#101113"/><rect x="4" y="4" width="56" height="56" fill="none" stroke="#bfa473" stroke-opacity=".65"/><path d="{paths}" fill="#d7bc88"/></svg>\n'''
 (ROOT/'favicon.svg').write_text(svg)
 (ROOT/'favicon-32.png').write_bytes(png(32));(ROOT/'apple-touch-icon.png').write_bytes(png(180));(ROOT/'favicon.ico').write_bytes(ico())
 print('SVG monogram, PNG 32/180 and ICO 16/32 generated')
