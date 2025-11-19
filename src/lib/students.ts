import { StudentsWithEmail } from "@/types/StudentsWithEmail";

import prisma from "./prisma";

export interface StudentsForGiveaway extends StudentsWithEmail {
  numberOfTotalPoints: number;
}

export async function getStudentsForGiveaway(): Promise<StudentsForGiveaway[]> {
  try {
    const students = await prisma.student.findMany({
      where: {
        user: {
          AND: [{ role: "STUDENT" }, { isAdmin: false }],
        },
      },
      include: {
        user: true,
        actionCompletions: {
          select: {
            action: {
              select: {
                points: true,
              },
            },
          },
        },
      },
    });

    const studentsWithPoints: StudentsForGiveaway[] = students.map(
      (student) => ({
        user: {
          email: student.user.email,
        },
        id: student.id,
        code: student.code,
        name: student.name,
        bio: student.bio,
        year: student.year,
        cv: student.cv,
        linkedin: student.linkedin,
        numberOfTotalPoints: student.actionCompletions.reduce(
          (sum: number, completion: { action: { points: number } }) =>
            sum + completion.action.points,
          0
        ),
      })
    );

    // Filter out losers
    return studentsWithPoints.filter(
      (student) => student.numberOfTotalPoints > 0
    );
  } catch (error) {
    console.error("Error fetching students for giveaway:", error);
    throw error;
  }
}

export async function getStudents() {
  return await prisma.student.findMany({
    where: {
      user: {
        AND: [{ role: "STUDENT" }],
      },
    },
    select: {
      id: true,
      code: true,
      name: true,
      bio: true,
      year: true,
      cv: true,
      linkedin: true,
      user: true,
      avatar: true,
    },
  });
}
