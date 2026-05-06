import { Module } from '@nestjs/common';
import { ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR } from 'src/core/application/contracts/infrastructure';
import { EncryptTools } from './encrypt.helper';
import { HashGeneratorTools } from './hash-generator.helper';
import { JwtGeneratorTools } from './jwt-generator.helper';

@Module({
    providers: [
        { provide: ENCRYPTER, useClass: EncryptTools },
        { provide: HASH_GENERATOR, useClass: HashGeneratorTools },
        { provide: JWT_GENERATOR, useClass: JwtGeneratorTools },
    ],
    exports: [ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR],
})
export class HelpersModule { }
