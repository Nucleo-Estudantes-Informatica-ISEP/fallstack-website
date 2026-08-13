export const actionNames = {
  createProfile: "Cria o teu Perfil",
  uploadCv: "Faz o Upload do teu CV",
  updateLinkedin: "Associa o teu LinkedIn",
};

export const actions = {
  names: actionNames,
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
