export const formatPhone = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) { // Ex: 32-8409
    return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
  } else if (numbers.length <= 10) { // Ex: 32-8409-6947 (10 dígitos)
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  } else if (numbers.length <= 11) { // Ex: 32-9-8409-6947 (11 dígitos)
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  } else {
    // Se tiver mais de 11 dígitos, trunca para 11 e formata
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  }
};

export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, '');
};