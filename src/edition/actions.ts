export const actionNames = {
  createProfile: "Cria o teu Perfil",
  uploadCv: "Faz o Upload do teu CV",
  updateLinkedin: "Associa o teu LinkedIn",
  akaPeopleBooth: "Banca AkaPeople",
  natixisBooth: "Banca Natixis",
  aprBooth: "Banca APR",
  hitachiBooth: "Banca Hitachi",
  convatecBooth: "Banca Convatec",
  niwBooth: "Banca NiW",
  deloitteBooth: "Banca Deloitte",
  accentureBooth: "Banca Accenture",
  armisBooth: "Banca Armis",
  devscopeBooth: "Banca Devscope",
  msgInsurItBooth: "Banca msg insur:it",
  glinttBooth: "Banca Glintt",
  konkConsultingBooth: "Banca konk consulting",
};

const boothActions: Record<string, string> = {
  akapeople: actionNames.akaPeopleBooth,
  natixis: actionNames.natixisBooth,
  apr: actionNames.aprBooth,
  "apr - technology solutions": actionNames.aprBooth,
  "hitachi solutions": actionNames.hitachiBooth,
  convatec: actionNames.convatecBooth,
  niw: actionNames.niwBooth,
  deloitte: actionNames.deloitteBooth,
  accenture: actionNames.accentureBooth,
  armis: actionNames.armisBooth,
  devscope: actionNames.devscopeBooth,
  "insur:it msg": actionNames.msgInsurItBooth,
  "msg insur:it": actionNames.msgInsurItBooth,
  glintt: actionNames.glinttBooth,
  konkconsulting: actionNames.konkConsultingBooth,
};

export const getBoothActionName = (companyName: string) =>
  boothActions[companyName.trim().toLowerCase()];

export const actions = {
  names: actionNames,
  boothByCompanyName: boothActions,
  seed: [
    {
      name: actionNames.createProfile,
      description: "Cria o teu perfil",
      points: 1,
    },
    {
      name: actionNames.updateLinkedin,
      description: "Associa o teu LinkedIn",
      points: 2,
    },
    {
      name: actionNames.uploadCv,
      description: "Faz o upload do teu CV",
      points: 3,
    },
    { name: "Palestra 1", description: "Assiste à palestra 1", points: 5 },
    { name: "Palestra 2", description: "Assiste à palestra 2", points: 5 },
    { name: "Palestra 3", description: "Assiste à palestra 3", points: 10 },
    {
      name: "Entrevista com o Teixeira",
      description: "Assiste à palestra 3",
      altText: "0x31r4",
      points: 10,
    },
  ],
};
