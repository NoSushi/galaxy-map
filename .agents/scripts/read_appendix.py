import fitz
import json
from pathlib import Path

document = fitz.open("attached_assets/Appendix_1789472994177.pdf")
out = Path("/tmp/appendix")
out.mkdir(exist_ok=True)
document[0].get_pixmap(matrix=fitz.Matrix(2, 2)).save(out / "page-1.png")
document[-1].get_pixmap(matrix=fitz.Matrix(2, 2)).save(out / "page-14.png")
for index, page in enumerate(document):
    (out / f"words-{index + 1}.json").write_text(json.dumps(page.get_text("words")))
print("Rendered first/last pages and extracted positioned words from", len(document), "pages.")