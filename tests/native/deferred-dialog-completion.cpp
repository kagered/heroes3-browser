#include "DeferredDialogCompletion.h"
#include <cassert>
#include <iostream>
int main(){
 DeferredDialogCompletion gate;int results=0;
 assert(!gate.takeReady(true,false));
 assert(gate.schedule([&]{++results;}));
 assert(!gate.schedule([&]{results+=100;}));
 assert(!gate.takeReady(false,false));assert(!gate.takeReady(true,true));assert(!gate.takeReady(false,true));
 assert(results==0);
 auto queued=gate.takeReady(true,false);assert(queued);assert(results==0);
 assert(!gate.takeReady(true,false));queued();assert(results==1);
 assert(!gate.takeReady(true,false));
 std::cout<<"PASS: queued messages and active dialog defer completion without blocking; completion extracted exactly once and executes only through caller dispatch\n";
}
