export interface QuerySpecZtdCase<
  BeforeDb extends Record<string, unknown> = Record<string, unknown>,
  Input = unknown,
  Output = unknown,
> {
  name: string;
  beforeDb: BeforeDb;
  input: Input;
  output: Output;
}
