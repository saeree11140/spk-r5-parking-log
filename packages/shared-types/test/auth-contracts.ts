import type {
  AuthUser,
  CreateUserInput,
  LoginInput,
  UserRole,
} from "../src/index";

const role: UserRole = "ADMIN";
const login: LoginInput = { username: "admin", password: "Password1234" };
const create: CreateUserInput = {
  username: "staff",
  displayName: "เจ้าหน้าที่",
  role: "STAFF",
  temporaryPassword: "Password1234",
};
const user: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "admin",
  displayName: "ผู้ดูแลระบบ",
  role,
  isActive: true,
  mustChangePassword: false,
};

void [login, create, user];
