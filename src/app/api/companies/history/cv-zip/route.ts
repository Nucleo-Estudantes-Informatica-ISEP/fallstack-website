import { NextResponse } from "next/server";
import JSZip from "jszip";

import prisma from "@/lib/prisma";
import getServerSession from "@/services/getServerSession";
import { createAdminClient } from "@/utils/supabase/admin";

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");

export async function GET() {
  const session = await getServerSession();

  if (!session || session.role !== "EMPLOYEE" || !session.employee?.company)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const savedStudents = await prisma.savedStudent.findMany({
    where: { savedBy: { companyId: session.employee.company.id } },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          code: true,
          cv: true,
        },
      },
    },
  });

  const studentsWithCv = savedStudents.filter(
    (entry) => entry.student.cv !== null
  );

  if (!studentsWithCv.length)
    return NextResponse.json(
      { error: "Nenhum CV disponível para exportar." },
      { status: 404 }
    );

  const admin = createAdminClient();
  const zip = new JSZip();

  // Adiciona os CVs ao zip
  for (const entry of studentsWithCv) {
    const cvId = entry.student.cv!;
    const supaPath = `distribution/cv/${cvId}.pdf`;
    const signed = await admin.storage
      .from("cvs")
      .createSignedUrl(supaPath, 60 * 5);

    if (signed.error || !signed.data?.signedUrl) continue;

    const res = await fetch(signed.data.signedUrl);
    if (!res.ok) continue;

    const buf = Buffer.from(await res.arrayBuffer());
    const filename = `${entry.student.code}-${sanitizeFilename(entry.student.name)}.pdf`;
    zip.file(filename, buf);
  }

  // Adiciona um CSV com os dados dos estudantes salvos (incluindo comentário)
  const csvHeader = "Nome,Código,Comentário\n";
  const csvRows = studentsWithCv.map((entry) => {
    // Escapa aspas e vírgulas
    const nome = `"${(entry.student.name || "").replace(/"/g, '""')}"`;
    const codigo = `"${(entry.student.code || "").replace(/"/g, '""')}"`;
    const comentario = `"${(entry.comment || "").replace(/"/g, '""')}"`;
    return [nome, codigo, comentario].join(",");
  });
  const csvContent = csvHeader + csvRows.join("\n");
  zip.file("dados.csv", csvContent);

  const hasFiles = Object.keys(zip.files).length > 0;
  if (!hasFiles)
    return NextResponse.json(
      { error: "Não foi possível gerar o ficheiro zip." },
      { status: 500 }
    );

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(new Blob([zipBuffer as Uint8Array<ArrayBuffer>]), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="cvs-guardados.zip"',
    },
  });
}
