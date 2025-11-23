"use client";

import { FunctionComponent, useState } from "react";
import Swal from "sweetalert";

import { StudentsForGiveaway } from "@/lib/students";
import ConfettiEffect from "@/components/ConfettiEffect";

interface GiveawaySectionProps {
  students: StudentsForGiveaway[];
  numberOfRandomizedStudents: number;
  tableRows: number;
}

const GiveawaySection: FunctionComponent<GiveawaySectionProps> = ({
  students,
  numberOfRandomizedStudents,
  tableRows,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [isConfettiVisible, setIsConfettiVisible] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);

  const numRows = Math.ceil(students.length / tableRows);

  const generateRandomStudentId = () => {
    const weightedStudents: string[] = [];
    students.forEach((student) => {
      for (let i = 0; i < student.numberOfTotalPoints; i++) {
        weightedStudents.push(student.id);
      }
    });

    const randomIndex = Math.floor(Math.random() * weightedStudents.length);
    return weightedStudents[randomIndex];
  };

  const handleGiveaway = (numberOfRandomStudents: number): void => {
    setIsRandomizing(true);
    const timeoutTimer = 100;
    let finalId: string = "";

    // Generate all IDs first
    const randomIds: string[] = [];
    for (let i = 0; i < numberOfRandomStudents; i++) {
      randomIds.push(generateRandomStudentId());
    }

    // Animate through the IDs
    randomIds.forEach((id, index) => {
      setTimeout(() => {
        setSelectedStudentId(id);
        if (index === randomIds.length - 1) {
          finalId = id;
          const winner = students.find((student) => student.id === finalId);

          // Show confetti
          setIsConfettiVisible(true);

          // Show winner alert
          setTimeout(() => {
            Swal({
              title: "Parabéns!",
              text: `O vencedor(a) foi ${winner?.name} (${winner?.numberOfTotalPoints} pontos) 🎉\n${winner?.user.email}`,
              icon: "success",
            });
          }, 500);

          // Cleanup
          setTimeout(() => {
            setIsConfettiVisible(false);
            setIsRandomizing(false);
          }, 3000);
        }
      }, timeoutTimer * index);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-16 rounded-3xl bg-white p-8">
      <h1 className="text-4xl font-bold text-black">
        Inscritos - {students.length}
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
        {Array.from({ length: numRows }, (_, rowIndex) => {
          return students
            .slice(rowIndex * tableRows, (rowIndex + 1) * tableRows)
            .map((student, colIndex) => (
              <div
                key={colIndex}
                className={`flex flex-col items-center justify-center border px-4 py-2 text-center font-semibold text-primary ${
                  student.id === selectedStudentId && "bg-primary text-white"
                }`}
              >
                <div>{student.name}</div>
                <div className="text-sm text-gray-500">
                  {student.numberOfTotalPoints} pts
                </div>
              </div>
            ));
        })}
      </div>
      <button
        onClick={() => handleGiveaway(numberOfRandomizedStudents)}
        disabled={isRandomizing}
        className="rounded-xl bg-[#D9D9D9] px-8 py-4 text-lg font-semibold text-black transition-colors duration-200 ease-in-out hover:bg-[#BFBFBF] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#D9D9D9]"
      >
        Selecionar vencedor 🎉
      </button>
      <ConfettiEffect visible={isConfettiVisible} />
    </div>
  );
};

export default GiveawaySection;
