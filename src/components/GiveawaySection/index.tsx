"use client";

import { FunctionComponent, useState } from "react";
import Swal from "sweetalert";

import ConfettiEffect from "@/components/ConfettiEffect";
import { pickGiveawayWinner } from "@/app/(admin)/giveaway/actions";

interface GiveawayStudent {
  id: string;
  name: string;
  points: number;
}

interface GiveawaySectionProps {
  students: GiveawayStudent[];
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

  const handleGiveaway = async (): Promise<void> => {
    if (students.length === 0) return;
    setIsRandomizing(true);

    // Winner is chosen on the server (weighted by points); the client only
    // animates toward the result. Emails never reach the browser except the
    // winner's, returned here.
    const winner = await pickGiveawayWinner();
    if (!winner) {
      setIsRandomizing(false);
      Swal({
        title: "Sem vencedor",
        text: "Não há inscritos elegíveis (ninguém tem pontos).",
        icon: "info",
      });
      return;
    }

    const timeoutTimer = 100;

    // Visual-only shuffle that lands on the server-chosen winner.
    const sequence: string[] = [];
    for (let i = 0; i < numberOfRandomizedStudents - 1; i++) {
      sequence.push(students[Math.floor(Math.random() * students.length)].id);
    }
    sequence.push(winner.id);

    sequence.forEach((id, index) => {
      setTimeout(() => {
        setSelectedStudentId(id);
        if (index === sequence.length - 1) {
          setIsConfettiVisible(true);

          setTimeout(() => {
            Swal({
              title: "Parabéns!",
              text: `O vencedor(a) foi ${winner.name} (${winner.points} pontos) 🎉\n${winner.email}`,
              icon: "success",
            });
          }, 500);

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
            .map((student) => (
              <div
                key={student.id}
                className={`flex flex-col items-center justify-center border px-4 py-2 text-center font-semibold text-primary ${
                  student.id === selectedStudentId && "bg-primary text-white"
                }`}
              >
                <div>{student.name}</div>
                <div className="text-sm text-gray-500">
                  {student.points} pts
                </div>
              </div>
            ));
        })}
      </div>
      <button
        onClick={handleGiveaway}
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
