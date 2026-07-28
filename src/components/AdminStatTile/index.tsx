interface AdminStatTileProps {
  label: string;
  value: number;
}

const AdminStatTile: React.FC<AdminStatTileProps> = ({ label, value }) => (
  <div className="w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-4xl font-bold text-gray-800">
      {value.toLocaleString("pt-PT")}
    </p>
  </div>
);

export default AdminStatTile;
