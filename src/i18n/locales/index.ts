import { addMessages } from "../index";
import zh from "./zh";
import en from "./en";

// 注册所有语言包
addMessages("zh", zh);
addMessages("en", en);

export { zh, en };
