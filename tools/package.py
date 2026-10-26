"""Build the installable theme without development code or credentials."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent.parent
out=root/'dist';out.mkdir(exist_ok=True)
theme=root/'theme'/'weldon-spring'
with zipfile.ZipFile(out/'weldon-spring-theme.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for path in sorted(theme.rglob('*')):
  if path.is_file():archive.write(path,path.relative_to(theme.parent))
with zipfile.ZipFile(out/'weldon-spring-theme.zip') as archive:
 assert archive.testzip() is None
 assert 'weldon-spring/style.css' in archive.namelist()
 assert 'weldon-spring/functions.php' in archive.namelist()
print(f'Built {out / "weldon-spring-theme.zip"}')
