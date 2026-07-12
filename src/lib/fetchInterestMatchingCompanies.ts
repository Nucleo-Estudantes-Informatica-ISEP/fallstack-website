import { Company, Interest } from "@prisma/client";

import prisma from "./prisma";

export async function fetchInterestMatchingCompanies(
  userId: string
): Promise<{ company: Company; matchingInterests: Interest[] }[]> {
  const companies = await prisma.company.findMany({
    include: {
      employees: {
        include: {
          user: {
            include: {
              interests: true,
            },
          },
        },
      },
    },
    where: {
      employees: {
        some: {
          user: {
            isAdmin: false,
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
      const companyInterests = company.employees.flatMap(
        (employee) => employee.user.interests
      );
      const uniqueCompanyInterests = Array.from(
        new Map(
          companyInterests.map((interest) => [interest.id, interest])
        ).values()
      );
      const matchingInterests = uniqueCompanyInterests.filter((interest) =>
        userInterests.some((userInterest) => userInterest.id === interest.id)
      );

      return {
        company,
        matchingInterests,
      };
    })
    .sort((a, b) => b.matchingInterests.length - a.matchingInterests.length)
    .slice(0, 3);
}
