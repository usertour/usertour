import { Module } from '@nestjs/common';
import { ReferencesService } from './services/references.service';

/**
 * Reverse references between content and the definitions it uses by id
 * (ADR 0016): the in-use guard every definition delete runs, and the
 * deleted-reference check publish runs.
 */
@Module({
  providers: [ReferencesService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
