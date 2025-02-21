import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { PrismaClient } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';

import { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';

const prisma = new PrismaClient();

const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    name: String
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
    users: [User!]!
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
    publishPost(id: ID!): Post!
    deletePost(id: ID!): Post
    register(email: String!, password: String!, name: String): User!
    login(email: String!, password: String!): String!
  }
`;

const resolvers = {
  Query: {
    posts: () => prisma.post.findMany({ include: { author: true } }),
    post: (_, { id }) => prisma.post.findUnique({ where: { id } }),
    users: () => prisma.user.findMany()
  },
  Mutation: {
    createPost: async (_, { title, content }, { userId }) => {
      if (!userId) throw new Error('Unauthorized');
      return prisma.post.create({
        data: {
          title,
          content,
          author: { connect: { id: userId } }
        }
      });
    },
    register: async (_, { email, password, name }) => {
      const hashedPassword = await argon2.hash(password);
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new Error('User already exists');
      
      return prisma.user.create({
        data: { 
          email, 
          password: hashedPassword, 
          name 
        }
      });
    },
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !await argon2.verify(user.password, password)) {
        throw new Error('Invalid credentials');
      }
      
      return jwt.sign(
        { userId: user.id }, 
        process.env.JWT_SECRET!,
        { expiresIn: '1d' }
      );
    }
  }
};

// 修改Apollo Server配置
const server = new ApolloServer({
  schema: makeExecutableSchema({ typeDefs, resolvers }),
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return {};
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return { userId: (decoded as any).userId };
    } catch {
      return {};
    }
  }
});

// 初始化CORS中间件
const cors = Cors({
  origin: ['http://localhost:5173'],
  methods: ['POST', 'OPTIONS'],
  credentials: true
});

// 添加CORS中间件处理
const runMiddleware = (req: NextApiRequest, res: NextApiResponse) => {
  return new Promise((resolve, reject) => {
    cors(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

// 修改导出部分
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res);
  return startServerAndCreateNextHandler(server)(req, res);
}