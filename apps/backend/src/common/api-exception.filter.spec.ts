import { BadRequestException, type ArgumentsHost } from '@nestjs/common';

import { ApiExceptionFilter } from './api-exception.filter';
import { DomainError } from './domain-error';

describe('ApiExceptionFilter', () => {
  function createHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as ArgumentsHost;
    return { host, status, json };
  }

  it('maps a domain error to its stable envelope', () => {
    const { host, status, json } = createHost();

    new ApiExceptionFilter().catch(
      new DomainError(404, 'HOUSE_NOT_FOUND', 'House not found'),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'HOUSE_NOT_FOUND',
      message: 'House not found',
    });
  });

  it('maps validation exceptions without leaking framework details', () => {
    const { host, status, json } = createHost();

    new ApiExceptionFilter().catch(
      new BadRequestException(['houseCode is invalid']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'houseCode is invalid',
    });
  });

  it('maps unknown errors without returning a stack', () => {
    const { host, status, json } = createHost();

    new ApiExceptionFilter().catch(new Error('secret detail'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});
