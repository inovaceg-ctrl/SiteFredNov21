export const formatWhatsApp = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + 9 + 8 dígitos)
  const limited = numbers.slice(0, 11);
  
  // Formata: 32-9-8409-6947
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 3) {
    return `${limited.slice(0, 2)}-${limited.slice(2)}`;
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 2)}-${limited.slice(2, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 2)}-${limited.slice(2, 3)}-${limited.slice(3, 7)}-${limited.slice(7, 11)}`;
  }
};

export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, '');
};
