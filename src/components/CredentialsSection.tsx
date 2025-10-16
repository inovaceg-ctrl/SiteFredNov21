import { GraduationCap, Award, Tv, BookOpen } from "lucide-react";

const CredentialsSection = () => {
  return (
    <section id="credentials" className="py-12 md:py-20 lg:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium mb-4">
            Formação e Reconhecimento
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
            Credenciais Acadêmicas e Profissionais
          </h2>
          <p className="text-lg text-slate-600">
            Uma formação completa e reconhecida nacionalmente em psicanálise, psicoterapia e sexologia.
          </p>
        </div>

        {/* Academic Formation */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Formação Acadêmica</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {academicCredentials.map((credential, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100 hover:border-blue-300 transition-all hover:shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-slate-900 mb-2">{credential.title}</h4>
                    <p className="text-blue-700 font-medium mb-1">{credential.institution}</p>
                    <p className="text-slate-600 text-sm">{credential.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TV & Media */}
        <div className="mb-16 bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-12">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Presença na Mídia</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {mediaPresence.map((media, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <Tv className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-lg text-white mb-2">{media.title}</h4>
                <p className="text-blue-200 font-medium mb-2">{media.show}</p>
                <p className="text-white/70 text-sm">{media.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Prêmios e Reconhecimentos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {awards.map((award, index) => (
              <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h4 className="font-semibold text-xl text-slate-900 mb-2">{award.title}</h4>
                <p className="text-orange-700 font-medium">{award.organization}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const academicCredentials = [
  {
    title: "Graduação em Psicanálise",
    institution: "Faculdade Elevo de Brasília (DF)",
    description: "Formação completa em teoria e prática psicanalítica"
  },
  {
    title: "Especialização em Psicoterapia Psicanalítica",
    institution: "Formação Especializada",
    description: "Aprofundamento em técnicas terapêuticas psicanalíticas"
  },
  {
    title: "Mestrado em Psicanálise",
    institution: "Instituto Oráculo de São Paulo",
    description: "Pesquisa avançada em psicanálise clínica"
  },
  {
    title: "Doutorado em Psicanálise",
    institution: "Instituto Oráculo de São Paulo",
    description: "Título de doutor com foco em psicanálise aplicada"
  },
  {
    title: "Especialização em Sexologia",
    institution: "Formação Especializada",
    description: "Expertise em terapia sexual e relacionamentos"
  },
  {
    title: "Pós-Graduação em Saúde Mental",
    institution: "Foco em Prescrição Farmacêutica",
    description: "Conhecimento integrado de psicofarmacologia"
  },
  {
    title: "Psicologia Social da Imagem",
    institution: "Universidade de São Paulo (USP)",
    description: "Formação em psicologia e imagem social"
  }
];

const mediaPresence = [
  {
    title: "Intensamente",
    show: "Programa Fama & Destaque (2024)",
    description: "Quadro sobre saúde mental e sexual"
  },
  {
    title: "Intensamente na Rede TV",
    show: "Com Apresentador Liqueri - ES",
    description: "Debates sobre bem-estar emocional"
  },
  {
    title: "Jovens Sonhadores",
    show: "Band TV - 3ª Temporada (2025)",
    description: "Programa nacional exibido aos sábados"
  }
];

const awards = [
  {
    title: "Miss Influencer",
    organization: "Grupo Vantagem JF"
  },
  {
    title: "Destaque do Ano",
    organization: "Grupo Vantagem JF"
  }
];

export default CredentialsSection;
