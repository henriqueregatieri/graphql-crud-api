const graphql = require('graphql');
const sqlite3 = require('sqlite3').verbose();

//create a database if no exists
const database = new sqlite3.Database('./graphql/products.db');

//create a table to insert product
const createProductsTable = () => {
  const query = `
        CREATE TABLE IF NOT EXISTS products (
        id integer PRIMARY KEY,
        name text,
        description text)`;

  return database.run(query);
};

//call function to init the product table
createProductsTable();

//creacte graphql product object
const ProductType = new graphql.GraphQLObjectType({
  name: 'Product',
  fields: {
    id: { type: graphql.GraphQLInt },
    name: { type: graphql.GraphQLString },
    description: { type: graphql.GraphQLString },
  },
});
// create a graphql query to select all and by id
var queryType = new graphql.GraphQLObjectType({
  name: 'Query',
  fields: {
    //first query to select all
    Products: {
      type: graphql.GraphQLList(ProductType),
      resolve: (root, args, context, info) => {
        return new Promise((resolve, reject) => {
          // raw SQLite query to select from table
          database.all('SELECT * FROM Products;', function (err, rows) {
            if (err) {
              reject([]);
            }
            resolve(rows);
          });
        });
      },
    },
    //second query to select by id
    Product: {
      type: ProductType,
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
        },
      },
      resolve: (root, { id }, context, info) => {
        return new Promise((resolve, reject) => {
          database.all(
            'SELECT * FROM Products WHERE id = (?);',
            [id],
            function (err, rows) {
              if (err) {
                reject(null);
              }
              resolve(rows[0]);
            }
          );
        });
      },
    },
  },
});
//mutation type is a type of object to modify data (INSERT,DELETE,UPDATE)
var mutationType = new graphql.GraphQLObjectType({
  name: 'Mutation',
  fields: {
    //mutation for creacte
    createProduct: {
      //type of object to return after create in SQLite
      type: ProductType,
      //argument of mutation creacteProduct to get from request
      args: {
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
        description: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
      },
      resolve: (root, { name, description }) => {
        return new Promise((resolve, reject) => {
          //raw SQLite to insert a new product in product table
          database.run(
            'INSERT INTO Products (name, description) VALUES (?,?);',
            [name, description],
            (err) => {
              if (err) {
                reject(null);
              }
              database.get('SELECT last_insert_rowid() as id', (err, row) => {
                resolve({
                  id: row['id'],
                  name: name,
                  description: description,
                });
              });
            }
          );
        });
      },
    },
    //mutation for update
    updateProduct: {
      //type of object to return afater update in SQLite
      type: graphql.GraphQLString,
      //argument of mutation creacteProduct to get from request
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
        },
        name: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
        description: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
        },
      },
      resolve: (root, { id, name, description }) => {
        return new Promise((resolve, reject) => {
          //raw SQLite to update a product in product table
          database.run(
            'UPDATE Products SET name = (?), description = (?) WHERE id = (?);',
            [name, description, id],
            (err) => {
              if (err) {
                reject(err);
              }
              resolve(`Product #${id} updated`);
            }
          );
        });
      },
    },
    //mutation for update
    deleteProduct: {
      //type of object resturn after delete in SQLite
      type: graphql.GraphQLString,
      args: {
        id: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
        },
      },
      resolve: (root, { id }) => {
        return new Promise((resolve, reject) => {
          //raw query to delete from product table by id
          database.run('DELETE from Products WHERE id =(?);', [id], (err) => {
            if (err) {
              reject(err);
            }
            resolve(`Product #${id} deleted`);
          });
        });
      },
    },
  },
});

//define schema with product object, queries, and mustation
const schema = new graphql.GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});

//export schema to use on index.js
module.exports = {
  schema,
};
