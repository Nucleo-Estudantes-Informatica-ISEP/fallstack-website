import { NextResponse } from "next/server";
import JSZip from "jszip";

import prisma from "@/lib/prisma";
import { buildSavedStudentsCsv } from "@/lib/savedStudentComments";
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

  // CSV always covers every saved student, including students without a CV.
  zip.file("dados.csv", buildSavedStudentsCsv(savedStudents));

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(new Blob([zipBuffer as Uint8Array<ArrayBuffer>]), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="cvs-guardados.zip"',
    },
  });
}
