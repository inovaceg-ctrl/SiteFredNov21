import React from 'react';

export const CredentialsSection = () => {
  const credentialText = "Reconhecido 5 vezes em premiações como melhor terapeuta em São Paulo. mãos e Mentes Brilhantes. Profissional do ano destaque de 2023. Premio raimundo nonato , personalidades 2023, 2024 e 2025.";

  return (
    <section className="py-8 px-4 bg-white shadow-sm rounded-lg">
      <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Credenciais e Reconhecimentos</h3>
      <div className="flex items-center justify-center text-center">
        <h4 className="font-semibold text-xl text-slate-900 mb-2">
          {credentialText}
        </h4>
      </div>
    </section>
  );
};