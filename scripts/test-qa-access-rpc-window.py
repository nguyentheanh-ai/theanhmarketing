import copy,importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('qa_window',Path(__file__).with_name('verify-qa-access-parity.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class WindowTest(unittest.TestCase):
 def fixture(self):
  a={'snapshotAt':'2026-10-18T12:00:00Z','course':{},'orders':[],'overrides':[],'guard':{'enrollments':[{'expires_at':None}],'contacts':[]}}
  b=copy.deepcopy(a);b['snapshotAt']='2026-10-18T12:00:02Z';return a,b
 def test_equal_endpoints_allowed_but_no_mvcc_claim(self):
  a,b=self.fixture();m.assert_qa_source_window(a,b)
 def test_any_changed_input_stops(self):
  for key in ['course','orders','overrides','guard']:
   a,b=self.fixture();b[key]={'changed':True}
   with self.assertRaises(RuntimeError):m.assert_qa_source_window(a,b)
 def test_expiration_crossing_stops(self):
  a,b=self.fixture();a['guard']['enrollments'][0]['expires_at']='2026-10-18T12:00:01Z';b['guard']=copy.deepcopy(a['guard'])
  with self.assertRaises(RuntimeError):m.assert_qa_source_window(a,b)
 def test_reversed_or_unzoned_clock_stops(self):
  for time in ['2026-10-18T11:59:59Z','2026-10-18T12:00:02']:
   a,b=self.fixture();b['snapshotAt']=time
   with self.assertRaises(RuntimeError):m.assert_qa_source_window(a,b)
if __name__=='__main__':unittest.main()
