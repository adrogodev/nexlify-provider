import { Module } from '@nestjs/common';
import { ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR } from 'src/core/application/contracts/infrastructure';
import { EncryptHelper } from './encrypt.helper';
import { HashGeneratorHelper } from './hash-generator.helper';
import { JwtGeneratorHelper } from './jwt-generator.helper';

@Module({
    providers: [
        { provide: ENCRYPTER, useClass: EncryptHelper },
        { provide: HASH_GENERATOR, useClass: HashGeneratorHelper },
        { provide: JWT_GENERATOR, useClass: JwtGeneratorHelper },
    ],
    exports: [ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR],
})
export class HelpersModule { }
