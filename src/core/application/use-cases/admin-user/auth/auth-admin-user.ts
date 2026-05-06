import { UseCase, UseCaseArgs } from 'src/core/domain/models/use-case.model';
import { HashGeneratorTools } from 'src/infrastructure/tools/hash-generator.tool';

export class AuthAdminUserUseCase implements UseCase<{ username: string; password: string }, boolean> {
    private readonly _hashGenerator = new HashGeneratorTools();

    constructor(private readonly _adminUserRepository) { }

    public run = async (args: UseCaseArgs<{ username: string; password: string }>): Promise<boolean> => {
        const { username, password } = args.data;

        const hashedPassword = this._hashGenerator.bcrypt(password);

        return true;
    };
}