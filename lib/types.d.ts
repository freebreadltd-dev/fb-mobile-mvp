type ReqResponseType = {
  success: boolean;
  data?: any;
  message: string;
};

type ContentType = "form" | "json";

type SetAccessToken = (token: string) => void | Promise<void>;

interface SuccessResponse {
  status: boolean;
  message: string;
  data: any | null;
  other?: any;
}
interface ErrorResponse {
  status: boolean;
  message: string;
  data: any | null;
  other?: any;
}
