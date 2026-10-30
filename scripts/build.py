#!/usr/bin/env python3
"""Build a standalone site using your own Heroes III Complete / SoD files."""
import argparse,importlib.util
from pathlib import Path
from fetch_engine import ROOT,ensure
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--russian',type=Path,help='Folder containing Data, Maps and Mp3')
    parser.add_argument('--english',type=Path,help='Folder containing Data, Maps and Mp3')
    parser.add_argument('--out',type=Path,default=ROOT/'dist')
    args=parser.parse_args()
    if not args.russian and not args.english:parser.error('Provide --english and/or --russian with your own game files')
    if args.out.exists():parser.error('Output already exists. Choose a new directory to avoid overwriting files.')
    ensure(check_only=True)
    spec=importlib.util.spec_from_file_location('site_export',ROOT/'src/export_site.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.export(args.out.resolve(),args.russian.expanduser().resolve() if args.russian else None,args.english.expanduser().resolve() if args.english else None)
