export function buildResponse<
  E extends true | false,
  T extends E extends true ? string : any
>(data: T, error?: E) {
  return {
    data: data,
    error: error || false,
  };
}

export function objectToSetStatement<T extends { [key: string]: any }>(
  obj: T,
  exclude: (keyof T)[]
) {
  const objTemp = { ...obj };

  const keys = Object.keys(objTemp);
  return keys
    .reduce((t, c) => {
      if (exclude.includes(c)) return t;
      return `${t} ${c} = @${c},`;
    }, "SET")
    .slice(0, -1);
}
