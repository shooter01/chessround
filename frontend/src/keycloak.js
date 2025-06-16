import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: `${window.location.origin}/auth`,
  realm: 'myrealm',
  clientId: 'myclient',
});

export default keycloak;
