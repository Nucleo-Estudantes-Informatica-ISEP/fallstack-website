export const signInFailures = {
  "auth-code-error": {
    message:
      "Não foi possível concluir o início de sessão com o AuthNEI. Tenta novamente.",
  },
  "auth-cancelled": {
    message:
      "O início de sessão foi interrompido. Podes retomá-lo quando quiseres.",
    action: "Retomar início de sessão",
  },
  "auth-expired": {
    message:
      "Este pedido de início de sessão já não está ativo. Inicia um novo pedido.",
    action: "Reiniciar início de sessão",
  },
  "auth-verification-required": {
    message:
      "Confirma o teu endereço de email no AuthNEI antes de voltares a iniciar sessão.",
    action: "Verificar email",
  },
} as const;

export type SignInFailure = keyof typeof signInFailures;

export function parseSignInFailure(value?: string): SignInFailure | undefined {
  return value && Object.hasOwn(signInFailures, value)
    ? (value as SignInFailure)
    : undefined;
}
