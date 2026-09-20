from datetime import datetime


def _pdf_text(value: str) -> bytes:
    safe = str(value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return safe.encode("latin-1", "replace")


def build_course_certificate_pdf(
    *,
    student_name: str,
    course_title: str,
    certificate_id: str,
    completed_at: datetime,
) -> bytes:
    date_text = completed_at.strftime("%d/%m/%Y")
    lines = [
        (26, 105, 735, "Certificado de finalización"),
        (14, 105, 685, "GASI · Formación sanitaria"),
        (13, 105, 620, "Se certifica que"),
        (22, 105, 580, student_name),
        (13, 105, 535, "ha completado satisfactoriamente el curso"),
        (18, 105, 495, course_title),
        (12, 105, 430, f"Fecha de finalización: {date_text}"),
        (10, 105, 395, f"Código de certificado: {certificate_id}"),
    ]

    commands = [b"BT"]
    for size, x, y, text in lines:
        commands.extend([
            f"/F1 {size} Tf".encode("ascii"),
            f"1 0 0 1 {x} {y} Tm".encode("ascii"),
            b"(" + _pdf_text(text) + b") Tj",
        ])
    commands.append(b"ET")
    stream = b"\n".join(commands) + b"\n"

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"endstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]

    pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{index} 0 obj\n".encode("ascii") + obj + b"\nendobj\n"

    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")

    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    ).encode("ascii")
    return pdf
