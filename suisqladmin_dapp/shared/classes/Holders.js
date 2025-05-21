import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { graphql } from '@mysten/sui/graphql/schemas/latest';
 

export default class Holders {
    /**
     * @param {Object} params Turbos parameters
     * @param {SuiMaster} params.suiMaster instance of suiMaster
     */
    constructor(params = {}) {
        this._suiMaster = params.suiMaster;
        this._coinType = params.coinType;
        this._nftType = params.nftType;

        this._gqlClient = new SuiGraphQLClient({
            url: 'https://sui-mainnet.mystenlabs.com/graphql',
        });

        this._holders = [];
        this._holdersIds = {};
    }

    get holders() {
        return this._holders;
    }

    async getNFTHolders(endCursor) {
      const afterQ = endCursor ? `after: "${endCursor}", ` : ' ';
      const query = graphql(`
{
  objects(first: 50, ${afterQ} filter: {type: "${this._nftType}"}) {
      pageInfo { hasNextPage endCursor }
    edges {
      
      node {
        asMoveObject {
          display { key value }
          owner {
            
                      __typename
          ... on AddressOwner {
            owner {
              defaultSuinsName
              address
              asAddress {
                address
              }
            }
          
          }
          
          ... on Immutable {
            _
          }
          ... on Shared {
            initialSharedVersion
          }
          ... on ConsensusV2 {
            startVersion
          }

            ... on Parent {
              parent {
                address
                asObject {
                  owner {
                    ... on Parent {
                      parent {
                        asObject {
                          asMoveObject {
                            contents {
                              json
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
          contents {
            json
            
          }
        }
      }
    }
  }
}
      `);

      const ret = [];
      let nextEndCursor = null;
      
      try {
        const result = await this._gqlClient.query({
            query: query,
            variables: {
                after: null,
            },
        });

        if (result?.data?.objects?.pageInfo?.hasNextPage) {
            nextEndCursor = result.data.objects.pageInfo.endCursor;
        }
        if (result?.data?.objects?.edges?.length) {
            for (const edge of result.data.objects.edges) {
                try {
                    let owner = edge.node.asMoveObject.owner?.owner?.address;
                    if (!owner) {
                      owner = edge.node.asMoveObject.owner?.parent?.asObject?.owner?.parent?.asObject?.asMoveObject?.contents?.json?.owner;
                    }
                    if (!owner) {
                      owner = edge.node.asMoveObject.owner?.parent?.asObject?.owner?.parent?.asObject?.asMoveObject?.contents?.json?.seller;
                    }

                    if (!owner) {
                      console.error(edge, 'owner not found');
                    }

                    const id = edge.node.asMoveObject.contents.json.id;
                    // const balance = BigInt(edge.node.asMoveObject.contents.json.balance.value);
                    // const defaultSuinsName = edge.node.asMoveObject.owner.owner.defaultSuinsName;

                    if (!id || !owner) {
                      console.error(owner, id);
                    }

                    ret.push({ owner, id });

                    if (!this._holdersIds[owner]) {
                        const holder = {
                            count: 0,
                            address: owner,
                            nfts: [],
                        };

                        this._holdersIds[owner] = holder;
                        this._holders.push(holder);
                    }

                    // this._holdersIds[owner].balance = this._holdersIds[owner].balance + balance;
                    if (this._holdersIds[owner].nfts.indexOf(id) === -1) {
                      this._holdersIds[owner].nfts.push(id);
                    }
                    this._holdersIds[owner].count = this._holdersIds[owner].nfts.length;

                } catch (e) {
                    console.log(e);
                }
            }
        }
      } catch (e) {
          console.log(e);
      }

      this._holders.sort((a, b) => (a.balance > b.balance) ? -1 : 1 );

      // if (this._holders.length > 220) {
      //   return ret;
      // }
      if (nextEndCursor) {
          const nextResult = await this.getNFTHolders(nextEndCursor);
          return ret.concat(nextResult);
      }

      return ret;
    }

    async getCoinHolders(endCursor) {

        const afterQ = endCursor ? `after: "${endCursor}", ` : ' ';
        const query = graphql(`
{
  objects(first: 50, ${afterQ} filter: {type: "0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${this._coinType}>"}) {
       pageInfo {
        hasNextPage
        endCursor
      }
    edges {
      
      node {
        asMoveObject {
          owner {
                      __typename
          ... on AddressOwner {
            owner {
              defaultSuinsName
              address
            }
          }
          }
          contents {
            json
          }
        }
      }
    }
  }
}
        `);

        const ret = [];
        let nextEndCursor = null;
        
        try {
            const result = await this._gqlClient.query({
                query: query,
                variables: {
                    after: null,
                },
            });

            if (result?.data?.objects?.pageInfo?.hasNextPage) {
                nextEndCursor = result.data.objects.pageInfo.endCursor;
            }
    
            if (result?.data?.objects?.edges?.length) {
                for (const edge of result.data.objects.edges) {
                    try {
                        const owner = edge.node.asMoveObject.owner.owner.address;
                        const id = edge.node.asMoveObject.contents.json.id;
                        const balance = BigInt(edge.node.asMoveObject.contents.json.balance.value);
                        const defaultSuinsName = edge.node.asMoveObject.owner.owner.defaultSuinsName;


                        ret.push({ owner, id, balance, defaultSuinsName });

                        if (!this._holdersIds[owner]) {
                            const holder = {
                                balance: 0n,
                                count: 0,
                                address: owner,
                                defaultSuinsName: defaultSuinsName,
                            };

                            this._holdersIds[owner] = holder;
                            this._holders.push(holder);
                        }

                        this._holdersIds[owner].balance = this._holdersIds[owner].balance + balance;
                        this._holdersIds[owner].count = this._holdersIds[owner].count + 1;

                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }


        this._holders.sort((a, b) => (a.balance > b.balance) ? -1 : 1 );

        // if (this._holders.length > 220) {
        //   return ret;
        // }

        if (nextEndCursor) {
            const nextResult = await this.getCoinHolders(nextEndCursor);
            return ret.concat(nextResult);
        }

        return ret; 
    }

}