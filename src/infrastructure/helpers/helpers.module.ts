import { Module } from '@nestjs/common';
import { APP_CONFIG, ENCRYPTER, HASH_GENERATOR, ID_GENERATOR, JWT_GENERATOR, PASSWORD_HASHER } from 'src/core/application/contracts/infrastructure';
import { AppConfigService } from '../environments/app-config.service';
import { EncryptHelper } from './encrypt.helper';
import { HashGeneratorHelper } from './hash-generator.helper';
import { IdGeneratorHelper } from './id-generator.helper';
import { JwtGeneratorHelper } from './jwt-generator.helper';
import { PasswordHasherHelper } from './password-hasher.helper';

@Module({
    providers: [
        { provide: APP_CONFIG, useClass: AppConfigService },
        { provide: ENCRYPTER, useClass: EncryptHelper },
        { provide: HASH_GENERATOR, useClass: HashGeneratorHelper },
        { provide: JWT_GENERATOR, useClass: JwtGeneratorHelper },
        { provide: PASSWORD_HASHER, useClass: PasswordHasherHelper },
        { provide: ID_GENERATOR, useClass: IdGeneratorHelper },
    ],
    exports: [APP_CONFIG, ENCRYPTER, HASH_GENERATOR, JWT_GENERATOR, PASSWORD_HASHER, ID_GENERATOR],
})
export class HelpersModule { }
