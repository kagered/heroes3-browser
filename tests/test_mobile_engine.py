import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('mobile_install',Path(__file__).resolve().parents[1]/'scripts/install_mobile_engine.py')
installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
class MobileEngineTests(unittest.TestCase):
 def test_old_launchers_keep_their_original_build(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);engine=root/'engine';site=root/'site';engine.mkdir();site.mkdir()
   legacy=site/'vendor-mobile';legacy.mkdir();(legacy/'vcmiclient.js').write_bytes(b'legacy-loader')
   for name in ['vcmiclient.js','vcmiclient.wasm','vcmi.data','vcmi.data.js']:(engine/name).write_bytes(('first-'+name).encode())
   old,_=installer.install(engine,site)
   (engine/'vcmiclient.js').write_bytes(b'new-loader');(engine/'vcmiclient.wasm').write_bytes(b'new-wasm')
   new,metadata=installer.install(engine,site)
   self.assertNotEqual(old,new)
   self.assertEqual((site/old/'vcmiclient.js').read_bytes(),b'first-vcmiclient.js')
   self.assertEqual((site/old/'vcmiclient.wasm').read_bytes(),b'first-vcmiclient.wasm')
   self.assertEqual((legacy/'vcmiclient.js').read_bytes(),b'legacy-loader')
   self.assertTrue(all(key.startswith(new) for key in metadata))
   again,_=installer.install(engine,site);self.assertEqual(new,again)
