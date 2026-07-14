import ActionQrCodeData from "@/components/Action/ActionQrCodeData";
import CloseActionButton from "@/components/Action/CloseActionButton";
import Custom404 from "@/app/not-found";
import { toActionDto } from "@/application/dto/actionDto";
import { getActionQrCode } from "@/application/services/actionService";
import getServerSession from "@/application/services/sessionService";

interface ActionParams {
  params: Promise<{
    id: string;
  }>;
}

const Actions = async ({ params }: ActionParams) => {
  const session = await getServerSession();

  if (!session || !session.isAdmin) {
    return Custom404();
  }

  const { id } = await params;
  const { action, qrCode } = await getActionQrCode(id);
  if (!action) return Custom404();
  const actionDto = toActionDto(action);

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-24 md:px-24">
      <h1 className="mb-12 text-3xl font-bold text-primary lg:text-6xl">
        {actionDto.name}
      </h1>
      <CloseActionButton id={id} action={actionDto} />
      <ActionQrCodeData id={id} initialQrCode={qrCode} />
    </section>
  );
};

export default Actions;
