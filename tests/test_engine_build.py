import hashlib,importlib.util,io,tarfile,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('engine_build',Path(__file__).resolve().parents[1]/'scripts/build_engine.py');build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
class EngineBuildPreparationTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);self.cache=self.root/'source.tar.gz'
  with tarfile.open(self.cache,'w:gz') as tar:
   payload=b'pinned source';entry=tarfile.TarInfo('repo-revision/example.cpp');entry.size=len(payload);tar.addfile(entry,io.BytesIO(payload))
  self.archive={'url':'https://example.invalid/unused','sha256':hashlib.sha256(self.cache.read_bytes()).hexdigest()}
 def tearDown(self):self.temp.cleanup()
 def test_empty_submodule_directory_and_repeat_preparation(self):
  dest=self.root/'source';dest.mkdir();build.prepare(self.archive,dest,self.cache)
  self.assertEqual((dest/'example.cpp').read_bytes(),b'pinned source')
  (dest/'example.cpp').write_text('local experimental change');build.prepare(self.archive,dest,self.cache)
  self.assertEqual((dest/'example.cpp').read_text(),'local experimental change')
 def test_bad_download_is_rejected_before_extracting(self):
  self.cache.write_bytes(b'corrupt');dest=self.root/'source'
  with self.assertRaises(ValueError):build.prepare(self.archive,dest,self.cache)
  self.assertFalse(dest.exists())
 def test_unmarked_existing_sources_are_not_overwritten(self):
  dest=self.root/'source';dest.mkdir();(dest/'keep').write_text('keep')
  with self.assertRaises(ValueError):build.prepare(self.archive,dest,self.cache)
  self.assertEqual((dest/'keep').read_text(),'keep')
