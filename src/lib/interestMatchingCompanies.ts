import { Company, Interest } from "@prisma/client";

import prisma from "./prisma";

export async function getInterestMatchingCompanies(
  userId: string
): Promise<{ company: Company; matchingInterests: Interest[] }[]> {
  const companies = await prisma.company.findMany({
    include: {
      employees: {
        take: 1,
        include: {
          user: {
            include: {
              interests: true,
            },
          },
        },
      },
    },
  });

  const userInterests = await prisma.interest.findMany({
    where: {
      users: {
        some: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return companies
    .map((company) => {
      const companyInterests = company.employees[0]?.user.interests ?? [];

      return {
        company,
        matchingInterests: companyInterests.filter((interest) =>
          userInterests.some((userInterest) => userInterest.id === interest.id)
        ),
      };
    })
    .sort((a, b) => b.matchingInterests.length - a.matchingInterests.length)
    .slice(0, 3);
}
