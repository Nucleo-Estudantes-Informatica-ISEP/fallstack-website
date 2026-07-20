interface AdminComingSoonProps {
  title: string;
}

const AdminComingSoon: React.FC<AdminComingSoonProps> = ({ title }) => {
  return (
    <section className="flex flex-col gap-2 p-8">
      <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      <p className="text-gray-500">Em breve.</p>
    </section>
  );
};

export default AdminComingSoon;
