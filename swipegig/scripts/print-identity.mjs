import { chainConfigs, SupportedChains } from '@goodsdks/citizen-sdk';
console.log("CELO config:", chainConfigs[SupportedChains.CELO]);
console.log("Identity Address:", chainConfigs[SupportedChains.CELO]?.contracts?.production?.identityContract);
