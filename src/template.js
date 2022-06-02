import template from 'babel-template'

export const promiseCatchStatement = template(`
  BODY.catch(function(ERR){
      HANDLER(ERR)
  })`)

export const promiseCatchEnhancer = template(`{
     HANDLER(ARGUMENTS)
    BODY
 }`)

export const returnStatement = template(`{
    return STATEMENT
}`)
